# Disposable lab collection. Terraform deletes its indexed faces on destroy.
resource "aws_rekognition_collection" "clients" {
  collection_id = var.rekognition_collection_name
}
