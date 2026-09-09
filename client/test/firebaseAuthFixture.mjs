const AUTH_EMULATOR = "http://127.0.0.1:44099";
const PROJECT_ID = "demo-bongii";
const API_KEY = "fake-api-key";

const requireOk = async (response, action) => {
  if (response.ok()) return response.json();
  throw new Error(`${action} failed: ${response.status()} ${await response.text()}`);
};

export const clearAuthUsers = async (request) => {
  const response = await request.delete(
    `${AUTH_EMULATOR}/emulator/v1/projects/${PROJECT_ID}/accounts`,
  );
  if (!response.ok()) throw new Error(`Clearing Auth emulator users failed: ${response.status()}`);
};

export const createVerifiedUser = async (request, {
  displayName = "Test Moderator",
  email = "moderator@example.com",
  password = "secure-password",
} = {}) => {
  const signup = await requireOk(await request.post(
    `${AUTH_EMULATOR}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`,
    { data: { displayName, email, password, returnSecureToken: true } },
  ), "Creating an Auth emulator user");

  await requireOk(await request.post(
    `${AUTH_EMULATOR}/identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${API_KEY}`,
    { data: { requestType: "VERIFY_EMAIL", idToken: signup.idToken } },
  ), "Requesting an Auth emulator verification code");

  const codes = await requireOk(await request.get(
    `${AUTH_EMULATOR}/emulator/v1/projects/${PROJECT_ID}/oobCodes`,
  ), "Reading Auth emulator verification codes");
  const verification = codes.oobCodes.find(
    (code) => code.email === email && code.requestType === "VERIFY_EMAIL",
  );
  if (!verification) throw new Error("Auth emulator did not create a verification code");

  await requireOk(await request.post(
    `${AUTH_EMULATOR}/identitytoolkit.googleapis.com/v1/accounts:update?key=${API_KEY}`,
    { data: { oobCode: verification.oobCode } },
  ), "Verifying an Auth emulator user");

  return { displayName, email, password };
};

export const signInTestUser = async ({ page, request, returnTo = "/home" }) => {
  const user = await createVerifiedUser(request);
  await page.goto(`/login?returnTo=${encodeURIComponent(returnTo)}`);
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Password").fill(user.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL(new RegExp(`${returnTo.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`));
  return user;
};

export const getOutOfBandCodes = async (request) => requireOk(await request.get(
  `${AUTH_EMULATOR}/emulator/v1/projects/${PROJECT_ID}/oobCodes`,
), "Reading Auth emulator out-of-band codes");

export const confirmEmailVerification = async (request, oobCode) => requireOk(await request.post(
  `${AUTH_EMULATOR}/identitytoolkit.googleapis.com/v1/accounts:update?key=${API_KEY}`,
  { data: { oobCode } },
), "Confirming an Auth emulator verification code");