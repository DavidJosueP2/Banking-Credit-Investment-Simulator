# CloudFront requires an ACM certificate in us-east-1 (our provider region).
resource "aws_acm_certificate" "frontend" {
  domain_name       = var.frontend_domain_name
  validation_method = "DNS"
  lifecycle {
    create_before_destroy = true
  }
  tags = { Name = "${local.name}-frontend-certificate" }
}

# Activate only after adding the validation CNAME manually in Cloudflare.
resource "aws_acm_certificate_validation" "frontend" {
  count                   = var.enable_frontend_distribution ? 1 : 0
  certificate_arn         = aws_acm_certificate.frontend.arn
  validation_record_fqdns = [for option in aws_acm_certificate.frontend.domain_validation_options : option.resource_record_name]
}

resource "aws_cloudfront_origin_access_control" "frontend" {
  count                             = var.enable_frontend_distribution ? 1 : 0
  name                              = "${local.name}-frontend-oac"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_cloudfront_function" "frontend_routes" {
  count   = var.enable_frontend_distribution ? 1 : 0
  name    = "${local.name}-frontend-routes"
  runtime = "cloudfront-js-2.0"
  publish = true
  code    = file("${path.module}/frontend-routes.js")
}

resource "aws_cloudfront_cache_policy" "frontend" {
  count       = var.enable_frontend_distribution ? 1 : 0
  name        = "${local.name}-frontend-cache"
  min_ttl     = 0
  default_ttl = 60
  max_ttl     = 31536000
  parameters_in_cache_key_and_forwarded_to_origin {
    enable_accept_encoding_brotli = true
    enable_accept_encoding_gzip   = true
    cookies_config { cookie_behavior = "none" }
    headers_config { header_behavior = "none" }
    query_strings_config { query_string_behavior = "none" }
  }
}

resource "aws_cloudfront_distribution" "frontend" {
  count               = var.enable_frontend_distribution ? 1 : 0
  enabled             = true
  comment             = "${local.name} static frontend"
  aliases             = [var.frontend_domain_name]
  default_root_object = "index.html"
  price_class         = "PriceClass_100"
  is_ipv6_enabled     = true
  wait_for_deployment = true
  origin {
    domain_name              = aws_s3_bucket.frontend.bucket_regional_domain_name
    origin_id                = "frontend-s3"
    origin_access_control_id = aws_cloudfront_origin_access_control.frontend[0].id
    s3_origin_config { origin_access_identity = "" }
  }
  default_cache_behavior {
    target_origin_id       = "frontend-s3"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true
    cache_policy_id        = aws_cloudfront_cache_policy.frontend[0].id
    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.frontend_routes[0].arn
    }
  }
  restrictions {
    geo_restriction { restriction_type = "none" }
  }
  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate_validation.frontend[0].certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }
}

data "aws_iam_policy_document" "frontend_read" {
  count = var.enable_frontend_distribution ? 1 : 0
  statement {
    actions   = ["s3:GetObject"]
    resources = ["${aws_s3_bucket.frontend.arn}/*"]
    principals {
      type        = "Service"
      identifiers = ["cloudfront.amazonaws.com"]
    }
    condition {
      test     = "StringEquals"
      variable = "AWS:SourceArn"
      values   = [aws_cloudfront_distribution.frontend[0].arn]
    }
  }
}

resource "aws_s3_bucket_policy" "frontend" {
  count  = var.enable_frontend_distribution ? 1 : 0
  bucket = aws_s3_bucket.frontend.id
  policy = data.aws_iam_policy_document.frontend_read[0].json
}
