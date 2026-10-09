-- phase_55 — Coach free-trial (Stage 1): trial state + message attribution.
--
-- coach_trials: one trial per parent (unique parent_key = normalised phone or lowercased email,
-- the same key the call queue groups on). Links to the users row used for login (user_id) and to
-- the assessment/report session (session_id). Trial content + onboarding are driven by worry /
-- archetype / age_band captured at grant time.
--
-- Additions beyond the in-message column list (flagged in the report):
--   • user_id        — the users row the parent logs into (login + coach_messages.user_id link)
--   • flagged_at      — set when a safety message is seen during the trial (admin flag, per decision 5)
--
-- coach_messages: reuse the existing table; add trial_id (which trial) + origin (script|llm).
-- cost stays in cost_paise (cost_inr = cost_paise / 100).

BEGIN;

CREATE TABLE IF NOT EXISTS coach_trials (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid REFERENCES users(id),
  parent_key    text NOT NULL,
  session_id    uuid,
  worry         text,
  archetype     text,
  age_band      text,
  status        text NOT NULL DEFAULT 'active' CHECK (status IN ('active','ended','converted')),
  started_at    timestamptz NOT NULL DEFAULT now(),
  ends_at       timestamptz NOT NULL,
  extended_days int  NOT NULL DEFAULT 0,
  granted_by    text,
  baseline_value text,
  commit_slot   text,
  flagged_at    timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- One active-or-past trial per parent.
CREATE UNIQUE INDEX IF NOT EXISTS idx_coach_trials_parent_key ON coach_trials (parent_key);
CREATE INDEX IF NOT EXISTS idx_coach_trials_user ON coach_trials (user_id);

-- Message attribution for trials (nullable: paid LMS messages keep trial_id = NULL).
ALTER TABLE coach_messages ADD COLUMN IF NOT EXISTS trial_id uuid REFERENCES coach_trials(id);
ALTER TABLE coach_messages ADD COLUMN IF NOT EXISTS origin   text CHECK (origin IN ('script','llm'));
CREATE INDEX IF NOT EXISTS idx_coach_messages_trial ON coach_messages (trial_id);

-- Register the trial funnel events (trackServer inserts these on grant / per message).
ALTER TABLE funnel_events DROP CONSTRAINT IF EXISTS funnel_events_event_type_check;
ALTER TABLE funnel_events ADD CONSTRAINT funnel_events_event_type_check CHECK (
  event_type = ANY (ARRAY[
    'assessment_started','assessment_question_complete','assessment_dimension_complete',
    'assessment_complete','report_gate_view','generating_page_view','generate_lead','report_view',
    'view_item','pricing_section_viewed','begin_checkout','checkout_modal_opened',
    'checkout_modal_dismissed','purchase','lms_day_complete','lms_reflection_submitted',
    'scroll_milestone','exit_intent_shown','landing_step_age','landing_step_concern',
    'landing_step_followup','pricing_variant_assigned','phone_capture_shown','teaser_shown',
    'paywall_shown','simplified_report_view','thankyou_screen_view','founder_call_requested',
    'roadmap_cta_click','whatsapp_click','landing_view','start_worry','start_age','start_age_view',
    'start_oob','start_oob_submit','start_child','start_phone','phone_captured','q_answered',
    'halfway_view','details_view','details_submitted','report_v2_view','report_section_view',
    'report_card_view','report_skip_to_plan','goal_changed','plan_v2_view','plan_cta_click',
    'call_click','day1_preview_view','question_view','answer_changed','assessment_intro_view',
    -- new in phase_55:
    'trial_started','coach_message_sent'
  ]::text[])
);

INSERT INTO schema_migrations (phase) VALUES ('phase_55_coach_trials') ON CONFLICT DO NOTHING;

COMMIT;
