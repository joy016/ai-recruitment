using System.Text.RegularExpressions;
using AngleSharp.Html.Parser;
using Ganss.Xss;

namespace ai_recruitment.Features.Inbox.Services
{
    // Thin wrapper around Ganss.Xss.HtmlSanitizer (the standard .NET HTML sanitizer), configured
    // for plain-text-email-style HTML: paragraphs, line breaks, lists, basic emphasis and links.
    // Everything else (scripts, iframes, style/class attributes, event handlers, data: URIs) is
    // stripped. AngleSharp (already pulled in transitively by HtmlSanitizer) is reused to derive
    // a plain-text rendering instead of adding a second HTML-parsing dependency.
    public partial class HtmlSanitizerService : IHtmlSanitizerService
    {
        [GeneratedRegex(@"<(p|br|li|div)[^>]*>", RegexOptions.IgnoreCase)]
        private static partial Regex BlockTagPattern();

        private readonly HtmlSanitizer _sanitizer;
        private readonly HtmlParser _parser = new();

        public HtmlSanitizerService()
        {
            _sanitizer = new HtmlSanitizer();
            _sanitizer.AllowedTags.Clear();
            foreach (var tag in new[] { "p", "br", "ul", "ol", "li", "strong", "b", "em", "i", "u", "a", "span", "blockquote" })
            {
                _sanitizer.AllowedTags.Add(tag);
            }

            _sanitizer.AllowedAttributes.Clear();
            _sanitizer.AllowedAttributes.Add("href");

            _sanitizer.AllowedSchemes.Clear();
            foreach (var scheme in new[] { "http", "https", "mailto" })
            {
                _sanitizer.AllowedSchemes.Add(scheme);
            }

            _sanitizer.AllowedCssProperties.Clear();
            _sanitizer.KeepChildNodes = true;
        }

        public string Sanitize(string html)
        {
            if (string.IsNullOrWhiteSpace(html))
            {
                return string.Empty;
            }

            return _sanitizer.Sanitize(html);
        }

        public string ToPlainText(string html)
        {
            if (string.IsNullOrWhiteSpace(html))
            {
                return string.Empty;
            }

            // Inserting a literal newline before each block-level tag (in the raw markup,
            // before parsing) makes the parser treat it as a preceding text node - simpler
            // than mutating the DOM afterward, and has the same effect once tags are stripped.
            var withBreaks = BlockTagPattern().Replace(html, "\n$0");

            using var document = _parser.ParseDocument(withBreaks);
            var text = document.Body?.TextContent ?? document.TextContent;

            return string.Join(
                "\n",
                text.Replace("\r\n", "\n")
                    .Split('\n')
                    .Select(line => line.Trim())
                    .Where(line => line.Length > 0));
        }
    }
}
