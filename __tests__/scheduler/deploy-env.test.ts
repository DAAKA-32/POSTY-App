import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { checkEnv, parseDotenv } from "../../functions/scripts/check-deploy-env.mjs";

const VALID_KEY = randomBytes(32).toString("base64");
const COMPLETE = {
  TOKEN_ENCRYPTION_KEY: VALID_KEY,
  ZERNIO_API_KEY: "sk_test",
  SEED_COMMENT_AUTOPOST: "false",
  POSTY_APP_URL: "https://postyapp.ai",
  CRON_SECRET: "s3cret",
};

describe("predeploy guard — functions/scripts/check-deploy-env.js", () => {
  it("blocks the exact production state of the incident (key absent)", () => {
    const { errors } = checkEnv({ ZERNIO_API_KEY: "sk_live" });
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(/TOKEN_ENCRYPTION_KEY is missing/);
  });

  it("accepts a complete, valid environment", () => {
    expect(checkEnv(COMPLETE)).toEqual({ errors: [], warnings: [] });
  });

  it("rejects a key that is not 32 bytes of base64", () => {
    expect(checkEnv({ ...COMPLETE, TOKEN_ENCRYPTION_KEY: "short" }).errors[0]).toMatch(/exactly 32 bytes/);
  });

  it("rejects a BOM-prefixed value (corrupts HTTP headers)", () => {
    const { errors } = checkEnv({ ...COMPLETE, ZERNIO_API_KEY: "﻿sk_live" });
    expect(errors.join(" ")).toMatch(/ZERNIO_API_KEY starts with a BOM/);
  });

  it("warns (without blocking) about optional features left unconfigured", () => {
    const { errors, warnings } = checkEnv({ TOKEN_ENCRYPTION_KEY: VALID_KEY });
    expect(errors).toEqual([]);
    expect(warnings.join(" ")).toMatch(/ZERNIO_API_KEY/);
    expect(warnings.join(" ")).toMatch(/SEED_COMMENT_AUTOPOST/);
    expect(warnings.join(" ")).toMatch(/CRON_SECRET/);
  });

  it("parses dotenv files the way firebase-tools writes/reads them", () => {
    const env = parseDotenv(
      '# comment\r\nTOKEN_ENCRYPTION_KEY="abc="\r\nEMPTY=\nPLAIN=value with spaces\n  \nSINGLE=\'quoted\'\n',
    );
    expect(env).toEqual({ TOKEN_ENCRYPTION_KEY: "abc=", EMPTY: "", PLAIN: "value with spaces", SINGLE: "quoted" });
  });

  it("never echoes secret values in its messages", () => {
    const { errors, warnings } = checkEnv({ ...COMPLETE, TOKEN_ENCRYPTION_KEY: "not-a-valid-key-value" });
    expect([...errors, ...warnings].join(" ")).not.toContain("not-a-valid-key-value");
  });
});
