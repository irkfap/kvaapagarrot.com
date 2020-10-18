# [kvaapagarrot.com](https://kvaapagarrot.com)


### Manual deployment

```bash
yarn deploy
```

### [GitHub Actions setup for App Engine](https://github.com/GoogleCloudPlatform/github-actions/tree/master/setup-gcloud)

1. Enable [App Engine Admin API](https://console.developers.google.com/apis/api/appengine.googleapis.com/overview) for your project.

2. Add Service Account in [Cloud Console → IAM & Admin → Service Accounts](https://console.cloud.google.com/iam-admin/serviceaccounts) and assign it the following Roles:

    - [App Engine Deployer](https://cloud.google.com/appengine/docs/standard/python/roles#separation_of_deployment_and_traffic_routing_duties)
    - App Engine Service Admin (to switch traffic to the new version)
    - Cloud Build Service Account (gcloud app deploy requires this)
    - Storage Object Viewer
    - Storage Object Creator (to upload new files)
    - Service Account User (to run operations as a service account)
    
    <details>
    <summary>Pro-tip</summary>
    
    You can also create a [Custom Role](https://console.cloud.google.com/iam-admin/roles) with the following permissions:
    
    ```text
    appengine.applications.get
    appengine.operations.get
    appengine.services.list
    appengine.services.update
    appengine.versions.create
    appengine.versions.list
    appengine.versions.update
    cloudbuild.builds.create
    cloudbuild.builds.get
    iam.serviceAccounts.actAs
    storage.buckets.get
    storage.objects.create
    storage.objects.delete
    storage.objects.get
    storage.objects.list
    ```
    </details>

    Create json key and base64-encode it:

    ```bash
    base64 ~/Downloads/xxx.json
    # or
    openssl base64 -in ~/Downloads/xxx.json | tr -d '\n'
    ```

3. Add project secrets in GitHub repo Settings → Secrets:

    `GCLOUD_PROJECT_ID` — GCP Project ID

    `GCP_SA_EMAIL` — Service Account Email

    `GOOGLE_APPLICATION_CREDENTIALS` — base64-encoded Service Account key

    `CONFIG_YAML` — base64-encoded app config (see `config.default.yaml`)

    You can get the latest config values directly from [@sibli](https://t.me/sibli).

4. Customize Workflow as needed in `.github/workflows/main.yml`
