# Release Notes - Omnichannel Agent Workflow

## New features

- **Agents tab** in `/omnichannel` for managing support agents.
  - Promote users to agents.
  - Set agent status (online / busy / offline).
  - Deactivate agents.
- **Agent Performance sub-tab** showing:
  - Total conversations, resolved/closed, upsell messages, conversion rate, resolution rate, and avg messages per conversation.
  - Top agents by outbound messages.
- **Queue tab** for unassigned conversations (admin only).
- **Handover** select in the conversation thread to reassign to another agent.
- **Admin agent filter** in the conversation list to view all, own, or a specific agent's conversations.
- **Close conversation** button in the message thread.
- Conversation list shows assigned agent avatar on each row.

## Scoping & routing

- Agents see only conversations assigned to them.
- Admins see all conversations and can filter by agent.
- New inbound conversations are auto-assigned to the best available agent.
- Closed conversations automatically reopen when a new inbound message arrives.
