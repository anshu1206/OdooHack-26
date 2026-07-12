from flask import Blueprint, render_template, request, redirect
from database import get_connection

vehicle = Blueprint("vehicle", __name__)

# -------------------------------
# Vehicle List
# -------------------------------


@vehicle.route("/vehicles")
def vehicles():

    search = request.args.get("search", "")

    conn = get_connection()
    cursor = conn.cursor()

    if search == "":

        cursor.execute("SELECT * FROM vehicles ORDER BY id DESC")

    else:

        cursor.execute("""

        SELECT *

        FROM vehicles

        WHERE registration_no LIKE %s
        OR vehicle_name LIKE %s

        """,

                       ("%" + search + "%",

                        "%" + search + "%"))

    data = cursor.fetchall()

    cursor.close()
    conn.close()

    return render_template(
        "vehicles/list.html",
        vehicles=data,
        search=search
    )


# -------------------------------
# Add Vehicle
# -------------------------------
@vehicle.route("/vehicles/add", methods=["GET", "POST"])
def add_vehicle():

    if request.method == "POST":

        registration = request.form["registration"]

        name = request.form["name"]

        model = request.form["model"]

        vehicle_type = request.form["type"]

        capacity = request.form["capacity"]

        odometer = request.form["odometer"]

        cost = request.form["cost"]

        conn = get_connection()

        cursor = conn.cursor()

        cursor.execute("""

        INSERT INTO vehicles(

        registration_no,

        vehicle_name,

        vehicle_model,

        vehicle_type,

        max_capacity,

        odometer,

        acquisition_cost

        )

        VALUES(%s,%s,%s,%s,%s,%s,%s)

        """, (registration, name, model, vehicle_type, capacity, odometer, cost))

        conn.commit()

        cursor.close()

        conn.close()

        return redirect("/vehicles")

    return render_template("vehicles/add.html")


@vehicle.route("/vehicles/delete/<int:id>")
def delete_vehicle(id):

    conn = get_connection()

    cursor = conn.cursor()

    cursor.execute(

        "DELETE FROM vehicles WHERE id=%s",

        (id,)

    )

    cursor.close()

    conn.close()

    return redirect("/vehicles")


@vehicle.route("/vehicles/edit/<int:id>", methods=["GET", "POST"])
def edit_vehicle(id):

    conn = get_connection()

    cursor = conn.cursor()

    if request.method == "POST":

        registration = request.form["registration"]
        name = request.form["name"]
        model = request.form["model"]
        vehicle_type = request.form["type"]
        capacity = request.form["capacity"]
        odometer = request.form["odometer"]
        cost = request.form["cost"]

        cursor.execute("""

        UPDATE vehicles

        SET

        registration_no=%s,

        vehicle_name=%s,

        vehicle_model=%s,

        vehicle_type=%s,

        max_capacity=%s,

        odometer=%s,

        acquisition_cost=%s

        WHERE id=%s

        """,

                       (

                           registration,

                           name,

                           model,

                           vehicle_type,

                           capacity,

                           odometer,

                           cost,

                           id

                       ))

        conn.commit()

        cursor.close()

        conn.close()

        return redirect("/vehicles")

    cursor.execute(
        "SELECT * FROM vehicles WHERE id=%s",
        (id,)
    )
    vehicle_data = cursor.fetchone()

    cursor.close()

    conn.close()

    return render_template(

        "vehicles/edit.html",

        vehicle=vehicle_data

    )
