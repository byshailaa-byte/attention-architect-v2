import { createHmac } from "crypto";

const SECRET = "2022b399b4ce69505506e0a6af4111ad74bdf615198db142757c720938446975";
const userId = "66cbb0d0-5082-43bb-b743-51016b80bf1b";
const exp = Math.floor(Date.now() / 1000) + 30 * 86400;
const payload = `${userId}.${exp}`;
const hmac = createHmac("sha256", SECRET).update(payload).digest("base64url");
const token = `${payload}.${hmac}`;
console.log(token);
