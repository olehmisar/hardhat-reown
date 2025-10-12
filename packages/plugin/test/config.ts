import { describe, it } from "node:test";

import { HardhatConfig, HardhatUserConfig } from "hardhat/types/config";
import assert from "node:assert/strict";
import { resolvePluginConfig, validatePluginConfig } from "../src/config.js";

describe("MyPlugin config", () => {
  describe("Config validation", () => {
    describe("Valid cases", () => {
      it("Should consider an empty config as valid", async () => {
        const validationErrors = await validatePluginConfig({});

        assert.equal(validationErrors.length, 0);
      });

      it("Should ignore errors in other parts of the config", async () => {
        const validationErrors = await validatePluginConfig({
          networks: {
            foo: {
              type: "http",
              url: "INVALID URL",
            },
          },
        });

        assert.equal(validationErrors.length, 0);
      });
    });
  });

  describe("Config resolution", () => {
    // The config resolution is always type-unsafe, as your plugin is extending
    // the HardhatConfig type, but the partially resolved config isn't aware of
    // your plugin's extensions. You are responsible for ensuring that they are
    // defined correctly during the resolution process.
    //
    // We recommend testing using an artificial partially resolved config, as
    // we do here, but taking care that the fields that your resolution logic
    // depends on are defined and valid.

    it("Should resolve a config without a reownAccounts field", async () => {
      const userConfig: HardhatUserConfig = {};
      const partiallyResolvedConfig = {} as HardhatConfig;

      const resolvedConfig = await resolvePluginConfig(
        userConfig,
        partiallyResolvedConfig,
      );

      assert.deepEqual(
        resolvedConfig.networks.default.reownAccounts,
        undefined,
      );
    });

    it("Should resolve a config with reownAccounts set to false", async () => {
      const userConfig: HardhatUserConfig = {
        networks: { default: { type: "edr-simulated", reownAccounts: false } },
      };
      const partiallyResolvedConfig = {} as HardhatConfig;

      const resolvedConfig = await resolvePluginConfig(
        userConfig,
        partiallyResolvedConfig,
      );

      assert.deepEqual(resolvedConfig.networks.default.reownAccounts, false);
    });

    it("Should resolve a config with reownAccounts set to true", async () => {
      const userConfig: HardhatUserConfig = {
        networks: { default: { type: "edr-simulated", reownAccounts: true } },
      };
      const partiallyResolvedConfig = {} as HardhatConfig;

      const resolvedConfig = await resolvePluginConfig(
        userConfig,
        partiallyResolvedConfig,
      );

      assert.deepEqual(resolvedConfig.networks.default.reownAccounts, true);
    });

    it("should throw an error if reownAccounts is set to true and accounts is set", async () => {
      const userConfig: HardhatUserConfig = {
        networks: {
          default: {
            type: "http",
            url: "https://example.com",
            reownAccounts: true,
            accounts: ["0x2342"],
          },
        },
      };
      const partiallyResolvedConfig = {} as HardhatConfig;

      await assert.rejects(
        resolvePluginConfig(userConfig, partiallyResolvedConfig),
        {
          message:
            "Expected accounts to NOT be set when reownAccounts is true.",
        },
      );
    });
  });
});
