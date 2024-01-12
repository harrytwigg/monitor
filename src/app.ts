import { publicIpv4 } from "public-ip";
import { monitorEnv } from "./env";
import { createDnsRecord, listDnsRecords, updateDnsRecord } from "./cloudflare";

let currentIp: string | null = null;

const handler = async () => {
  const ip = await publicIpv4();
  if (ip === currentIp) {
    return;
  }

  const records = await listDnsRecords();

  if (records === null) {
    console.warn("No DNS records found.");
    return;
  }

  const record = records.result.find(
    (record) => record.name === monitorEnv.DOMAIN_NAME,
  );
  if (!record) {
    const successfullyCreated = await createDnsRecord({ newIpAddress: ip });

    if (successfullyCreated) {
      currentIp = ip;
    }
    return;
  }

  // If record already exists, with same name and type then dont update
  if (record.type === "A" && record.content === ip) {
    return;
  }

  const successfullyUpdated = await updateDnsRecord({
    newIpAddress: ip,
    recordId: record.id,
  });

  if (successfullyUpdated) {
    currentIp = ip;
  }
};

console.log("Starting Monitor 🦎");

setInterval(() => {
  handler().catch((error) =>
    console.error(
      "An unhandled error occurred while updating DNS record.",
      error,
    ),
  );
}, 1000);
