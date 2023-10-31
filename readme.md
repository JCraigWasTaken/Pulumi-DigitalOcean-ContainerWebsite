# Pulumi-DigitalOcean-ContainerWebsite

## Description

This project helps you automate the deployment of your web application to DigitalOcean using Pulumi. It sets up a droplet with docker that can run a container, puts that dropley behind a loadbalancer, and sets up domain records to point to the load balancer.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Setup](#setup)
- [Deployment](#deployment)
- [Pulumi Refresh](#pulumi-refresh)

## Prerequisites

- Node.js (v18+ recommended)
- NPM (v9+ recommended)
- A DigitalOcean account
- A GitHub account

## Setup

Follow these steps to get your environment set up:

1. Purchase a domain name from a domain registrar.
2. Create a DigitalOcean token with read and write access.
3. Create a GitHub classic personal access token with `read:package` access.
4. Generate an SSH key:
   - Run `ssh-keygen` in a terminal.
   - Run `cat ~/.ssh/id_rsa.pub` to get your public SSH key.
5. Create a `.env` file in the root directory and populate it with the necessary values:
   ```
   DIGITALOCEAN_TOKEN=<DigitalOceanTokenValue>
   GHCR_TOKEN=<GitHubClassicPATValue>
   GHCR_PACKAGE=<YourGHCRPackage> // Looks like ghcr.io/...
   GITHUB_USERNAME=<YourGitHubUsername>
   SSH_KEY=<PublicSSHKey>
   ```
6. Update `domainName`, `subdomainName`, and `healthCheckPath` in `index.ts`.
7. Run npm install

## Deployment

To deploy your application, run the following command:

```
pulumi up
```

This command will provision the required infrastructure on DigitalOcean and deploy your web application.

## Pulumi Refresh

If you need to synchronize your Pulumi stack's state with the actual cloud resources, you can use the pulumi refresh command. This is particularly useful if some manual changes have been made to the cloud resources, or if you want to ensure that the Pulumi state matches the real-world resources.

To run the refresh:

```
pulumi refresh
```

You'll see a preview that shows what resources would be updated, added, or deleted. Confirm the refresh to proceed. Keep in mind that this operation won't modify your real-world resources, but it will update your stack's state file to align with the actual resources.
