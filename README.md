# comp3011-web

The nutrition endpoints expect a `USDA_API_KEY` environment variable.

For local development:

- keep `.env` as your real local secret file
- keep `.env.example` as the committed template
- the app only reads `.env`, not `.env.example`

Create a project-root `.env` file like this:

```env
USDA_API_KEY=your_usda_api_key_here
```

For deployment, set `USDA_API_KEY` in the hosting environment instead of relying on `.env`.

On PythonAnywhere or similar hosts, configure the variable in the app startup environment or set it in the WSGI/ASGI config before the app imports, for example:

```python
import os

os.environ["USDA_API_KEY"] = "your_usda_api_key_here"
```

The app prefers the real host environment variable and only uses `.env` as a local fallback. It also trims extra quotes or whitespace from the key value.
