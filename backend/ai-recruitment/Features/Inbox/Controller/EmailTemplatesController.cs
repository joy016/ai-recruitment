using ai_recruitment.Features.Authorization;
using ai_recruitment.Features.Inbox.Dto;
using ai_recruitment.Features.Inbox.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ai_recruitment.Features.Inbox.Controller
{
    // Templates are plain text shortcuts for Compose - they never link to candidate status.
    [ApiController]
    [Route("api/email-templates")]
    [Authorize]
    public class EmailTemplatesController : ControllerBase
    {
        private readonly IEmailTemplateService _templates;

        public EmailTemplatesController(IEmailTemplateService templates)
        {
            _templates = templates;
        }

        [HttpGet]
        [HasPermission(PermissionNames.Inbox.Send)]
        public async Task<IActionResult> GetAll(CancellationToken cancellationToken)
        {
            return Ok(await _templates.GetActiveTemplatesAsync(cancellationToken));
        }

        [HttpGet("{key}")]
        [HasPermission(PermissionNames.Inbox.Send)]
        public async Task<IActionResult> GetByKey(string key, CancellationToken cancellationToken)
        {
            var template = await _templates.GetByKeyAsync(key, cancellationToken);
            return template == null ? NotFound(Error("TEMPLATE_NOT_FOUND", "Template not found.")) : Ok(template);
        }

        [HttpPost("{key}/render")]
        [HasPermission(PermissionNames.Inbox.Send)]
        public async Task<IActionResult> Render(string key, [FromBody] RenderTemplateRequestDto dto, CancellationToken cancellationToken)
        {
            var rendered = await _templates.RenderAsync(key, dto, cancellationToken);
            return rendered == null ? NotFound(Error("TEMPLATE_NOT_FOUND", "Template not found or inactive.")) : Ok(rendered);
        }

        [HttpPost]
        [HasPermission(PermissionNames.Inbox.ManageTemplates)]
        public async Task<IActionResult> Create([FromBody] CreateEmailTemplateDto dto, CancellationToken cancellationToken)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(Error("VALIDATION_ERROR", "Invalid template payload."));
            }

            try
            {
                var created = await _templates.CreateAsync(dto, cancellationToken);
                return CreatedAtAction(nameof(GetByKey), new { key = created.Key }, created);
            }
            catch (Microsoft.EntityFrameworkCore.DbUpdateException)
            {
                return Conflict(Error("TEMPLATE_KEY_TAKEN", "A template with this key already exists."));
            }
        }

        [HttpPatch("{id:guid}")]
        [HasPermission(PermissionNames.Inbox.ManageTemplates)]
        public async Task<IActionResult> Update(Guid id, [FromBody] UpdateEmailTemplateDto dto, CancellationToken cancellationToken)
        {
            var updated = await _templates.UpdateAsync(id, dto, cancellationToken);
            return updated == null ? NotFound(Error("TEMPLATE_NOT_FOUND", "Template not found.")) : Ok(updated);
        }

        [HttpDelete("{id:guid}")]
        [HasPermission(PermissionNames.Inbox.ManageTemplates)]
        public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
        {
            var deleted = await _templates.SoftDeleteAsync(id, cancellationToken);
            return deleted ? NoContent() : NotFound(Error("TEMPLATE_NOT_FOUND", "Template not found."));
        }

        private static object Error(string code, string message) => new { error = new { code, message } };
    }
}
