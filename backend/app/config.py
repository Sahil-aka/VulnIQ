from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "postgresql+psycopg://vuln:local-only-change-me@postgres:5432/vulniq"
    jwt_secret: str = "local-only-change-this-secret"
    admin_user: str = "admin"
    admin_password: str = "local-only-change-me"
    scan_dir: str = "/data/scans"
    trivy_timeout: int = 600
    trivy_db_repositories: str = "docker.io/aquasec/trivy-db,public.ecr.aws/aquasecurity/trivy-db,ghcr.io/aquasecurity/trivy-db"
    nmap_timeout: int = 300

    model_config = SettingsConfigDict(extra="ignore")


settings = Settings()


