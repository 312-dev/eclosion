from api import create_app
from core import config

app = create_app()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=config.SERVER_PORT)
