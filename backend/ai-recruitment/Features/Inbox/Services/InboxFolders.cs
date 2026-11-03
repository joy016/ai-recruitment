using ai_recruitment.Features.Inbox.Model;

namespace ai_recruitment.Features.Inbox.Services
{
    // A thread's folder is not its own stored field - IsArchived/IsDeleted/Status live on each
    // EmailMessage - so it is derived from the thread's most recent message. This keeps a
    // thread's location intuitive (a reply landing in an archived or trashed thread brings it
    // back to Inbox, exactly like clicking "unarchive" would) without a separate denormalized
    // "thread" table to keep in sync.
    public static class InboxFolders
    {
        public const string Inbox = "inbox";
        public const string Sent = "sent";
        public const string Drafts = "drafts";
        public const string Starred = "starred"; // a view, not a real location - see below
        public const string Archived = "archived";
        public const string Trash = "trash";

        public static string Resolve(EmailMessage latest)
        {
            if (latest.IsDeleted)
            {
                return Trash;
            }

            if (latest.IsArchived)
            {
                return Archived;
            }

            if (latest.Status == EmailStatus.Draft)
            {
                return Drafts;
            }

            return latest.Direction == EmailDirection.Outbound ? Sent : Inbox;
        }
    }
}
