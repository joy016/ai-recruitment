namespace ai_recruitment.Features.Inbox.Model
{
    public class EmailTemplate
    {
        public Guid Id { get; set; }

        // Stable slug used by the frontend's "Use Template" dropdown and by /render -
        // never shown to the user. See EmailTemplateSeedData for the 4 seeded keys.
        public required string Key { get; set; }

        public required string Name { get; set; }
        public required string Subject { get; set; }
        public string BodyHtml { get; set; } = string.Empty;
        public string BodyText { get; set; } = string.Empty;

        // Documents which {{placeholders}} this template supports, e.g. ["recipient_first_name"].
        // Purely informational for an admin editing the template - rendering itself works off
        // whatever tokens actually appear in BodyHtml/Subject.
        public List<string> Variables { get; set; } = [];

        public int SortOrder { get; set; }

        // Soft delete: DELETE /api/email-templates/:id sets this to false instead of removing
        // the row, so historical EmailMessage.TemplateId references stay resolvable.
        public bool IsActive { get; set; } = true;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }
    }
}
