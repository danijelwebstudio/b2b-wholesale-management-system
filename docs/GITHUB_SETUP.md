# GitHub Presentation Setup

Do this after the portfolio files are committed locally.

## Suggested repository name

`b2b-wholesale-operations`

Alternative if you want to keep the project identity:

`bracazoric-b2b`

## Repository description

Use this as the short GitHub description:

> Mobile B2B wholesale workflow: orders, warehouse fulfillment, invoices, debt tracking and transactional payment allocation with React Native, Node.js and PostgreSQL.

## Suggested topics

`react-native`, `expo`, `nodejs`, `express`, `postgresql`, `jwt`, `rest-api`, `b2b`, `backend`, `portfolio-project`

## Before making the repository public

Run:

```bash
git status
git log --oneline --decorate -5
git ls-files | findstr /I ".env"
```

Expected result for the last command: `.env.example` may appear; the real `.env` must not.

Also search the tracked files for obvious secrets/passwords other than the intentionally documented local demo credentials.

## Create the GitHub repository

Create an **empty** repository on GitHub. Do not initialize it with another README, `.gitignore` or license because the local repository already contains its own history.

Then GitHub will show commands similar to:

```bash
git remote add origin https://github.com/YOUR_USERNAME/b2b-wholesale-operations.git
git push -u origin main
```

Use the exact remote URL GitHub gives you.

## What the profile visitor should see first

The root README should immediately communicate:

1. the business problem;
2. screenshots;
3. the end-to-end workflow;
4. architecture and database model;
5. the payment/refactor story;
6. tests and local setup.

Do not lead with a huge dependency list.

## Pinning / portfolio use

After publishing:

- pin the repository on your GitHub profile;
- add a short demo video link near the top of the README when it exists;
- use the same project name and wording on your CV/portfolio;
- keep commits understandable instead of squashing the entire project into one anonymous upload.

## Suggested CV entry

**B2B Wholesale Operations System — React Native, Node.js, PostgreSQL**

Built a mobile workflow for store ordering, warehouse fulfillment, invoicing and debt tracking. Refactored the MVP with JWT/RBAC, server-side tenant isolation and transactional oldest-invoice-first payment allocation using PostgreSQL row locking and allocation audit records; added automated tests for authorization and financial allocation logic.

## Suggested portfolio copy (less technical)

A mobile system designed around the real workflow between a wholesaler and retail stores. Stores can quickly send orders, while the warehouse records what was actually delivered and keeps invoices, debt, payments and returned packaging synchronized. I first built the complete workflow, then redesigned the sensitive parts so user access and financial updates are controlled by the server and recorded consistently.
