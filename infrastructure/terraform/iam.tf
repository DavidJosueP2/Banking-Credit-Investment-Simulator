# ECS assumes these roles; application code receives only the task role.
data "aws_iam_policy_document" "ecs_trust" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["ecs-tasks.amazonaws.com"]
    }

    condition {
      test     = "StringEquals"
      variable = "aws:SourceAccount"
      values   = [data.aws_caller_identity.current.account_id]
    }

    condition {
      test     = "ArnLike"
      variable = "aws:SourceArn"
      values   = ["arn:aws:ecs:${var.aws_region}:${data.aws_caller_identity.current.account_id}:*"]
    }
  }
}

resource "aws_iam_role" "ecs_execution" {
  name               = "${local.name}-ecs-execution"
  assume_role_policy = data.aws_iam_policy_document.ecs_trust.json
}

resource "aws_iam_role_policy_attachment" "ecs_execution" {
  role       = aws_iam_role.ecs_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_iam_role" "backend_task" {
  name               = "${local.name}-backend-task"
  assume_role_policy = data.aws_iam_policy_document.ecs_trust.json
}

# Trust only the backend task role to issue browser credentials.
data "aws_iam_policy_document" "liveness_trust" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "AWS"
      identifiers = [aws_iam_role.backend_task.arn]
    }
  }
}

resource "aws_iam_role" "liveness" {
  name               = "${local.name}-liveness"
  assume_role_policy = data.aws_iam_policy_document.liveness_trust.json
}

data "aws_iam_policy_document" "liveness_permissions" {
  statement {
    actions   = ["rekognition:StartFaceLivenessSession"]
    resources = ["*"]
  }
}

resource "aws_iam_role_policy" "liveness" {
  name   = "${local.name}-liveness-stream"
  role   = aws_iam_role.liveness.id
  policy = data.aws_iam_policy_document.liveness_permissions.json
}

data "aws_iam_policy_document" "backend_permissions" {
  # These APIs do not support resource-level permissions.
  statement {
    actions = [
      "textract:DetectDocumentText",
      "rekognition:DetectFaces",
      "rekognition:CompareFaces",
      "rekognition:CreateFaceLivenessSession",
      "rekognition:GetFaceLivenessSessionResults"
    ]
    resources = ["*"]
  }

  statement {
    actions = [
      "rekognition:IndexFaces",
      "rekognition:DeleteFaces",
      "rekognition:SearchFacesByImage"
    ]
    resources = [aws_rekognition_collection.clients.arn]
  }

  statement {
    actions   = ["sts:AssumeRole"]
    resources = [aws_iam_role.liveness.arn]
  }
}

resource "aws_iam_role_policy" "backend_task" {
  name   = "${local.name}-backend-aws"
  role   = aws_iam_role.backend_task.id
  policy = data.aws_iam_policy_document.backend_permissions.json
}
