# [kvaapagarrot.com](https://kvaapagarrot.com)

### Dev server

```bash
yarn watch
```

### Manual deployment

```bash
yarn build
yarn static
yarn deploy
```

### Build container locally with [Buildpacks](https://buildpacks.io/docs/tools/pack/)

```bash
pack build kvaapagarrot-local --builder gcr.io/buildpacks/builder
docker run --rm -p 8080:8080 kvaapagarrot-local
docker stop $(docker ps --filter "ancestor=kvaapagarrot-local" --format "{{.Names}}" --quiet)
```


### [GitHub Actions setup for App Engine](https://github.com/GoogleCloudPlatform/github-actions/tree/master/setup-gcloud)

1. Enable [App Engine Admin API](https://console.developers.google.com/apis/api/appengine.googleapis.com/overview) for your project.

2. Launch `scripts/setup_gcloud.sh [PROJECT_ID]` script **OR** do a manual setup via Cloud Console:

    Add Service Account in [Cloud Console → IAM & Admin → Service Accounts](https://console.cloud.google.com/iam-admin/serviceaccounts) and assign it the following Roles:

    - [App Engine Deployer](https://cloud.google.com/appengine/docs/standard/python/roles#separation_of_deployment_and_traffic_routing_duties)
    - App Engine Service Admin (to switch traffic to the new version)
    - Cloud Build Service Account (gcloud app deploy requires this)
    - Storage Object Viewer
    - Storage Object Creator (to upload new files)
    - Service Account User (to run operations as a service account)

    Create json key and base64-encode it:

    ```bash
    base64 ~/Downloads/xxx.json
    # or
    openssl base64 -in ~/Downloads/xxx.json | tr -d '\n'
    ```

3. Add project secrets in GitHub repo Settings → Secrets:

    `GCP_SA_EMAIL` — Service Account Email

    `GOOGLE_APPLICATION_CREDENTIALS` — base64-encoded Service Account key

4. Customize Workflow as needed in `.github/workflows/main.yml` (set `GCLOUD_PROJECT_ID`, etc.)

5. Set `LHCI_GITHUB_APP_TOKEN` to enable [Lighthouse CI](https://github.com/apps/lighthouse-ci) audit.
