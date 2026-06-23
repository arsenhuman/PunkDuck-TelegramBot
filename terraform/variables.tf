variable "project_id" {
  description = "GCP project ID where the VM will be created"
  type        = string
}

variable "region" {
  description = "GCP region for the VM"
  type        = string
  default     = "us-central1"
}

variable "zone" {
  description = "GCP zone for the VM (must be within the chosen region)"
  type        = string
  default     = "us-central1-a"
}

variable "machine_type" {
  description = "GCP machine type for the bot VM"
  type        = string
  default     = "n2d-standard-2"
}

variable "vm_name" {
  description = "Name of the Compute Engine instance"
  type        = string
  default     = "punkduck-bot"
}

variable "ssh_user" {
  description = "Username for SSH access (used by Ansible to connect)"
  type        = string
  default     = "punkduck"
}

variable "ssh_public_key_path" {
  description = "Path to your local SSH public key file, added to the VM's metadata for access"
  type        = string
}