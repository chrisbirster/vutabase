/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    const cloudflareApiToken = (process.env.CLOUDFLARE_API_TOKEN || "").trim();
    return {
      name: "starter-infra",
      home: "aws",
      removal: input?.stage === "production" ? "retain" : "remove",
      providers: {
        aws: {
          region: (process.env.AWS_REGION ?? "us-east-1") as any,
        },
        ...(cloudflareApiToken !== ""
          ? {
              cloudflare: {
                apiToken: cloudflareApiToken,
              },
            }
          : {}),
      },
    };
  },
  async run() {
    const authHeaderName = (process.env.APP_EMAIL_SEND_AUTH_HEADER || "Authorization").trim();
    const sender = (process.env.APP_EMAIL_SENDER || "starter-template.example.com").trim();
    const from = (process.env.APP_EMAIL_FROM || "no-reply@starter-template.example.com").trim();
    const manualSesIdentity = (process.env.APP_MANUAL_SES_IDENTITY || "true").trim().toLowerCase() !== "false";
    const appOrigin = (process.env.APP_ORIGIN || "https://app.starter-template.example.com").trim();
    const marketingDomain = (process.env.APP_MARKETING_DOMAIN || "starter-template.example.com").trim();
    const marketingOrigin = (process.env.APP_MARKETING_ORIGIN || "https://starter-template.example.com").trim();
    const enableMarketingSite = (process.env.APP_ENABLE_MARKETING_SITE || "true").trim().toLowerCase() !== "false";

    const emailApiKey = new sst.Secret("EmailApiKey");
    const emailIdentity = manualSesIdentity
      ? undefined
      : new sst.aws.Email("StarterEmail", {
          sender,
          dns: sst.cloudflare.dns(),
        });

    const emailApi = new sst.aws.Function("EmailApi", {
      handler: "functions/email.handler",
      runtime: "nodejs20.x",
      timeout: "15 seconds",
      memory: "256 MB",
      url: true,
      link: emailIdentity ? [emailIdentity, emailApiKey] : [emailApiKey],
      permissions: manualSesIdentity
        ? [
            {
              actions: ["ses:SendEmail", "ses:SendRawEmail"],
              resources: ["*"],
            },
          ]
        : undefined,
      environment: {
        EMAIL_SEND_AUTH_HEADER: authHeaderName,
        EMAIL_FROM: from,
      },
    });

    let website: sst.cloudflare.StaticSite | undefined;
    if (enableMarketingSite) {
      requireCloudflareConfig(marketingDomain);
      website = new sst.cloudflare.StaticSite("WebSite", {
        path: "../marketing",
        build: {
          command: "bun run build",
          output: "dist",
        },
        environment: {
          APP_ORIGIN: appOrigin,
          APP_MARKETING_ORIGIN: marketingOrigin,
          APP_SUPPORT_EMAIL: "support@starter-template.example.com",
        },
        domain: marketingDomain,
        errorPage: "index.html",
      });
    }

    return {
      region: process.env.AWS_REGION ?? "us-east-1",
      sender,
      from,
      manualSesIdentity,
      authHeaderName,
      emailApiBaseUrl: emailApi.url,
      marketingEnabled: enableMarketingSite,
      webDomain: website ? marketingDomain : undefined,
      webUrl: website?.url,
    };
  },
});

function requireCloudflareConfig(domain: string) {
  const accountId = (process.env.CLOUDFLARE_DEFAULT_ACCOUNT_ID || "").trim();
  const apiToken = (process.env.CLOUDFLARE_API_TOKEN || "").trim();
  if (accountId !== "" && apiToken !== "") {
    return;
  }
  throw new Error(
    `Cloudflare config missing for marketing deploy (${domain}). Set CLOUDFLARE_DEFAULT_ACCOUNT_ID and CLOUDFLARE_API_TOKEN.`,
  );
}
