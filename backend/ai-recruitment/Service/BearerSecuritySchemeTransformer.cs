using Microsoft.AspNetCore.OpenApi;
using Microsoft.OpenApi;

namespace ai_recruitment.Service
{
    // Adds a JWT "Bearer" security scheme to the generated OpenAPI document so
    // Swagger UI renders an Authorize button. Swashbuckle only serves the UI here
    // (see Program.cs UseSwaggerUI) - the document itself comes from
    // Microsoft.AspNetCore.OpenApi's AddOpenApi/MapOpenApi, so the scheme has to
    // be registered as a document transformer rather than via AddSwaggerGen.
    public class BearerSecuritySchemeTransformer : IOpenApiDocumentTransformer
    {
        public Task TransformAsync(OpenApiDocument document, OpenApiDocumentTransformerContext context, CancellationToken cancellationToken)
        {
            document.Components ??= new OpenApiComponents();
            document.Components.SecuritySchemes ??= new Dictionary<string, IOpenApiSecurityScheme>();
            document.Components.SecuritySchemes["Bearer"] = new OpenApiSecurityScheme
            {
                Type = SecuritySchemeType.Http,
                Scheme = "bearer",
                BearerFormat = "JWT",
                In = ParameterLocation.Header,
                Description = "Paste the JWT returned by /api/Auth/login. The \"Bearer \" prefix is added automatically."
            };

            var securityRequirement = new OpenApiSecurityRequirement
            {
                [new OpenApiSecuritySchemeReference("Bearer", document)] = new List<string>()
            };

            if (document.Paths is not null)
            {
                foreach (var pathItem in document.Paths.Values)
                {
                    if (pathItem.Operations is null)
                    {
                        continue;
                    }

                    foreach (var operation in pathItem.Operations.Values)
                    {
                        operation.Security ??= new List<OpenApiSecurityRequirement>();
                        operation.Security.Add(securityRequirement);
                    }
                }
            }

            return Task.CompletedTask;
        }
    }
}
