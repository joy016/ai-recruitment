namespace ai_recruitment.Features.Inbox.Services
{
    public interface IHtmlSanitizerService
    {
        // Strips scripts, event handlers (onclick, onerror, ...) and any tag/attribute not on
        // the email-safe allow list, keeping simple formatting (p/br/ul/li/strong/em/a/...).
        // Used both before storing a message and again before returning one to the client.
        string Sanitize(string html);

        // Derives a plain-text version from (already sanitized) HTML, for BodyText / previews.
        string ToPlainText(string html);
    }
}
