// eslint-disable-next-line
const axios = require("axios");
const core = require("@actions/core");

const updateOrCreateRecord = async (domain: string, dnslink: string) => {
  if (!core.getInput("CF_API_TOKEN") || !core.getInput("CF_ZONE_ID")) {
    throw new Error("CF_API_TOKEN or CF_ZONE_ID were not specified");
  }
  const baseUrl = `https://api.cloudflare.com/client/v4/zones/${core.getInput(
    "CF_ZONE_ID"
  )}/web3/hostnames`;
  const cfClient = axios.create({
    headers: { Authorization: `Bearer ${core.getInput("CF_API_TOKEN")}` },
    baseURL: baseUrl,
  });
  console.log("fetching hostnames", baseUrl);
  const { data } = await cfClient.get("/");
  if (!data.success) {
    throw new Error("failed to fetch hostnames");
  }

  const hostnames = data.result;
  console.log("fetched hostnames", hostnames);

  if (!hostnames.length) {
    throw new Error("no hostnames");
  }

  const hostname = hostnames.find((hostname) => hostname.name === domain);
  if (!hostname) {
    throw new Error(`no hostname matching ${domain}`);
  }

  try {
    console.log("updating hostname", hostname, dnslink);
    const { data: recordUpdateData } = await cfClient.patch(`/${hostname.id}`, {
      dnslink,
    });
    console.log("updated hostname", recordUpdateData);
  } catch (e) {
    console.log("e", e.response.data.errors[0]);
    throw new Error(e.response.data.errors[0].message);
  }
};

const publish = async () => {
  const domain = core.getInput("CF_DEPLOYMENT_DOMAIN");
  const hash = core.getInput("HASH");

  if (!domain || !hash) {
    throw new Error("must provide domain and hash");
  }

  console.log(`trying to update DNS for ${domain} with ${hash}`);
  console.log(`domain to update - https://${domain}`);
  console.log("updating dns link record");
  await updateOrCreateRecord(domain, `/ipfs/${hash}/`);
  console.log("done");
  process.exit(0);
};

publish();
