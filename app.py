from flask import Flask, render_template, request, redirect

from routes.vehicle import vehicle

app = Flask(__name__)

app.secret_key = "transitops"

# Register Blueprint
app.register_blueprint(vehicle)


# ------------------------
# LOGIN
# ------------------------
@app.route("/", methods=["GET", "POST"])
def login():

    if request.method == "POST":

        email = request.form["email"]
        password = request.form["password"]
        role = request.form["role"]

        # Temporary Login
        if email == "fleet@transitops.com" and password == "123":

            return redirect("/dashboard")

        else:

            return render_template(
                "login.html",
                error="Invalid Email or Password"
            )

    return render_template("login.html")


# ------------------------
# DASHBOARD
# ------------------------
@app.route("/dashboard")
def dashboard():

    return render_template("dashboard.html")


if __name__ == "__main__":
    app.run(debug=True)