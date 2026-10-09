-- phase_56 — UTM attribution columns + the handbook_lead funnel event.
-- ADDITIVE ONLY: new nullable columns + a CHECK recreation that only ADDS 'handbook_lead'.
-- No DELETE/UPDATE of existing rows.

BEGIN;

-- First-party UTM attribution on the assessment/lead row (populated at submit from the aa_utm cookie).
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS utm_source   text;
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS utm_medium   text;
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS utm_campaign text;
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS utm_content  text;
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS utm_term     text;

-- Register handbook_lead in the funnel_events CHECK (keeps every existing value; adds one).
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
    -- new in phase_56:
    'handbook_lead'
  ]::text[])
);

INSERT INTO schema_migrations (phase) VALUES ('phase_56_utm_handbook') ON CONFLICT DO NOTHING;

COMMIT;
