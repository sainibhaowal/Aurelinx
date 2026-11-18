# Profile and System Controls

## 01. Profile & System Controls

Workspace Settings is the account and system-control surface. It contains the signed-in profile, AI provider configuration, logout, the full in-app data reset, and permanent account deletion.

**Before using a destructive control:** verify the active account and workspace, export or back up any required data, confirm the intended scope, and ensure you have the authority to perform the action. Reset and deletion are not ordinary navigation actions and should be treated as irreversible without a verified backup.

**Profile tab**

Shows the signed-in full name, email, role (Administrator or Standard User), and account creation time. These are displayed account values; this screen does not provide an edit-profile workflow.

The profile notice distinguishes workspace data from login identity: resetting application data preserves login accounts, while account deletion removes the signed-in account and logs out.

**AI Providers tab**

Open **AI Providers** to manage the local provider inventory and model assignment. Provider credentials, endpoint/base URL, selected model, provider category, connection test, model discovery, and active-provider selection are handled there.

Use the provider-specific setup and the Providers & Webhooks chapter for connection details. Keep keys private, use approved endpoints, test before activation, and confirm which provider/model downstream AI features will use.

### Account and workspace actions

**Logout**

Select **Logout now** to end the current session and return to the login screen. It does not reset workspace records or delete the account.

**Reset application data**

Type `RESET` exactly, then select the reset button. This clears in-app employee, candidate, chat, analytics, connector, and application records while preserving login accounts.

On success, workspace caches are cleared while the authentication token, signed-in user, and tenant identifier are preserved. A server error leaves the action unsuccessful and displays an error message.

**Delete account**

Type `DELETE` exactly, then select the permanent deletion button. The API removes the currently authenticated account; success immediately calls logout.

If deletion fails, the account is not treated as deleted and the error is shown for retry or administrator support.

**End-to-end recovery and governance checklist**

- Confirm identity, tenant, role, and the intended action.
- Export required records and preserve audit evidence before reset or deletion.
- For provider changes, rotate exposed credentials, test the endpoint, and record the selected model and owner.
- For reset, enter RESET and wait for the success response; refresh dependent screens and verify expected empty-state behavior.
- For deletion, enter DELETE only after retention, legal hold, backup, and administrator requirements are satisfied.
- Record the operator, timestamp, reason, scope, result, and any recovery action in the approved audit process.
Do not use reset or account deletion as a troubleshooting shortcut. Contact an administrator when scope, ownership, backup status, or recovery requirements are unclear.

return null; };

{isOpen && (

e.stopPropagation()} >
