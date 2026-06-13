# Preston SDA Church Portal - Best-in-Class Workflow Build

This version expands the app from a basic admin tool into a church operations and Sabbath communication platform.

## Major additions

- This Sabbath Command Centre
- Automatic Sabbath readiness score and checklist
- Content planner with status, priority, expiry, placement, and templates
- Roster and bulletin workflow with readiness percentage
- Styled landscape bulletin print layout
- Speaker/preacher submission link workflow
- Member ministry profiles with ministries, preferred roles, availability, communication preference, and roster frequency
- Role-based navigation for leader, pastor, communications, roster, bulletin, prayer, clerk, viewer, and super admin roles
- Care request workflow with statuses
- Weekly email draft generator
- Audit history collection for important actions
- Improved dashboard actions and workflow-oriented UI

## Install

```powershell
npm install
cd functions
npm install
cd ..
```

## Run locally

```powershell
npm run dev
```

## Build

```powershell
npm run build
```

## Deploy to preview channel

```powershell
firebase hosting:channel:deploy new-app --project prestonsda-5ef63
```

## Deploy live when ready

```powershell
firebase deploy --only hosting --project prestonsda-5ef63
```

## Notes

This app still uses the same Firebase project and existing Firestore collection paths so it can run beside the current app during testing. Hosting preview channels separate the website files, but data is still shared unless you point the app to a staging Firebase project or staging collections.


## Member management portal upgrade

This version expands the app into a fuller member-management portal. It adds richer member profiles, household/contact fields, ministry and rostering preferences, pastoral care status, safety/consent fields, tags, search filters, member profile view, and internal note trails.

Requests and Communications now include note trails. Leaders can open a request, add follow-up notes, update priority/status, and keep pastoral/admin context attached to the request. Communications can be logged by channel and audience, with additional internal notes added over time.

If deploying rules, run:

```powershell
firebase deploy --only firestore:rules --project prestonsda-5ef63
```

Then deploy the preview app as usual:

```powershell
npm run build
firebase hosting:channel:deploy new-app --project prestonsda-5ef63
```
