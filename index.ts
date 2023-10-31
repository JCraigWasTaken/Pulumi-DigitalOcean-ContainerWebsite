import * as pulumi from "@pulumi/pulumi";
import * as digitalocean from "@pulumi/digitalocean";
import { Region, DropletSlug } from "@pulumi/digitalocean";
import * as dotenv from "dotenv";

dotenv.config();

const domainName: string | null = null;
const subdomainName: string | null = null; //Leave null if you want to use the root domain
const healthCheckPath: string | null = null; //Leave null if you don't want to use a health check

if (domainName === null) {
  throw new Error("Please provide a domain name");
}

if (process.env.SSH_KEY === undefined) {
  throw new Error("Please provide a SSH key");
}

const variablePrefix =
  subdomainName === null ? `${domainName}` : `${domainName}-${subdomainName}`;

const provider = new digitalocean.Provider("provider", {
  token: process.env.DIGITALOCEAN_TOKEN,
});

const cloudInitData = `#cloud-config
runcmd:
  - echo "${process.env.GHCR_TOKEN}" | docker login ghcr.io -u ${process.env.GITHUB_USERNAME} --password-stdin
  - docker pull ${process.env.GHCR_PACKAGE}
  - docker run -d -p 80:8080 ${process.env.GHCR_PACKAGE}
`;

const sshKeys = new digitalocean.SshKey(
  `${variablePrefix}-sshkey`,
  {
    name: `${variablePrefix}-sshkey`,
    publicKey: process.env.SSH_KEY as string,
  },
  { provider: provider }
);

const droplet = new digitalocean.Droplet(
  `${variablePrefix}-droplet`,
  {
    image: "docker-20-04",
    region: Region.TOR1,
    size: DropletSlug.DropletS1VCPU1GB,
    sshKeys: [sshKeys.id],
    userData: cloudInitData,
  },
  { provider: provider }
);

const domain = new digitalocean.Domain(
  `${variablePrefix}-domain`,
  {
    name: domainName,
  },
  { provider: provider }
);

const certDomains = domain.name.apply((domainNameValue) =>
  subdomainName
    ? [
        domainNameValue,
        `www.${domainNameValue}`,
        `${subdomainName}.${domainNameValue}`,
        `www.${subdomainName}.${domainNameValue}`,
      ]
    : [domainNameValue, `www.${domainNameValue}`]
);

const cert = new digitalocean.Certificate(
  `${variablePrefix}-certificate`,
  {
    type: "lets_encrypt",
    domains: certDomains,
  },
  { provider: provider }
);

const loadBalancer = new digitalocean.LoadBalancer(
  `${variablePrefix}-loadBalancer`,
  {
    dropletIds: droplet.id.apply((id) => [parseInt(id)]),
    forwardingRules: [
      {
        entryPort: 80,
        entryProtocol: "http",
        targetPort: 80,
        targetProtocol: "http",
      },
      {
        entryPort: 443,
        entryProtocol: "https",
        targetPort: 80,
        targetProtocol: "http",
        certificateId: cert.id,
      },
    ],
    healthcheck:
      healthCheckPath === null
        ? undefined
        : {
            port: 80,
            protocol: "http",
            path: healthCheckPath,
          },
    region: droplet.region,
  },
  { provider: provider }
);

const wwwRootDomainRecord = new digitalocean.DnsRecord(
  `www-${variablePrefix}-domainDNSRecord`,
  {
    domain: domain.name,
    type: "A",
    name: "www",
    value: loadBalancer.ip,
  },
  { provider: provider }
);

let subdomainRecord;
let wwwSubdomainRecord;

if (subdomainName !== null) {
  subdomainRecord = new digitalocean.DnsRecord(
    `${variablePrefix}-subdomainDNSRecord`,
    {
      domain: domain.name,
      type: "A",
      name: subdomainName,
      value: loadBalancer.ip,
    },
    { provider: provider }
  );

  wwwSubdomainRecord = new digitalocean.DnsRecord(
    `www-${variablePrefix}-subdomainDNSRecord`,
    {
      domain: domain.name,
      type: "A",
      name: `www.${subdomainName}`,
      value: loadBalancer.ip,
    },
    { provider: provider }
  );
}

const exportedValues: {
  dropletIP?: pulumi.Output<string>;
  domainNameOutput?: pulumi.Output<string>;
  loadBalancerIp?: pulumi.Output<string>;
  certificateId?: pulumi.Output<string>;
  wwwRootDomainRecordIp?: pulumi.Output<string>;
  subdomainRecordIp?: pulumi.Output<string>;
  wwwSubdomainRecordIp?: pulumi.Output<string>;
} = {
  dropletIP: droplet.ipv4Address,
  domainNameOutput: domain.name,
  loadBalancerIp: loadBalancer.ip,
  certificateId: cert.id,
  wwwRootDomainRecordIp: wwwRootDomainRecord.value,
};

if (subdomainRecord && wwwSubdomainRecord) {
  exportedValues.subdomainRecordIp = subdomainRecord.value;
  exportedValues.wwwSubdomainRecordIp = wwwSubdomainRecord.value;
}

export const infraOutputs = exportedValues;
