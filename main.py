import requests
import json
import datetime
import os
'''TO DO LIST:
Create the TOTAL sorting'''


# GLOBALS
PATH = os.path.dirname(os.path.realpath(__file__))   # Gets the absolute path for the running file
RAW_PATH = PATH + "/data/{}/raw/"
EDIT_PATH = PATH + "/data/{}/edited/"
FILE_NAME = "Riven_data_{}_{}.json"
TOTAL_FILE_NAME = "TOTAL_{}.json"
L_MONDAY = ""
PLATFORMS = ["PC", "PS4", "XB1", "SWI"]
URL = "https://n9e5v4d8.ssl.hwcdn.net/repos/weeklyRivens{}.json"


# Gets the last monday date
def last_monday():
    today = datetime.date.today()
    monday = today - datetime.timedelta(days=today.weekday())
    return monday


# Gets the json for a given platform
def get_riven_json(platform):
    print(f"Checking if this week json for {platform} is saved!")
    file_path = RAW_PATH.format(platform) + FILE_NAME.format(platform, L_MONDAY.strftime("%y-%m-%d"))

    # Checks if the file already exists
    if not os.path.isfile(file_path):
        print("No file found, creating it!\n-----------------")
        r = requests.get(URL.format(platform))
        r.raise_for_status()
        data = r.json()
        with open(file_path, "w") as outfile:
            json.dump(data, outfile, indent=4)
    else:
        print("File already exists!\n-----------------")


# Takes the raw data and saves the edited JSON
def process_data(platform):

    # Goes over every file in the raw folder and checks if it has a edited version
    for filename in os.listdir(RAW_PATH.format(platform)):
        print(f"Processing {filename}\n")
        date = filename.rstrip(".json")[-8:]
        raw_file_path = RAW_PATH.format(platform) + filename
        edit_file_path = EDIT_PATH.format(platform) + filename
        if os.path.isfile(edit_file_path):
            print(f"/edited/{filename} Aleady exists!")
        else:
            with open(raw_file_path, "r") as raw:
                raw_data = json.load(raw)
                sales = sale_calc(raw_data)
                raw_dict = create_dict(raw_data, 1)
                del raw_data

            total_dict = total_json(platform, raw_dict, date, sales)
            comparison(platform, raw_dict, total_dict, sales, filename)


# Calculates the number of sales
def sale_calc(data):
    print("Calculating the total sales number!")
    min_price = []
    max_price = []
    pop = []
    for d in data:
        min_price.append(d["min"])
        max_price.append(d["max"])
        pop.append(d["pop"])

    min_pop = min(pop)
    pop_ind = pop.index(min_pop)
    if min_price[pop_ind] == max_price[pop_ind]:
        trades = 100 / min_pop
        return trades
    else:
        return None


# Creates the total files
def total_json(platform, raw_dict, date, sales):
    total_path = EDIT_PATH.format(platform) + TOTAL_FILE_NAME.format(platform)
    try:
        with open(total_path, "r") as file:
            total_file = json.load(file)
            total_dict = create_dict(total_file, 3)
            dates = total_file[0]
            del total_file
        print(f"Found TOTAL_{platform} adding data!")

        if date in dates:
            print("Date already exists something is wrong!")

        dates.append(date)

        for key in list(raw_dict.keys()):
            if raw_dict[key]["median"] == 0:
                median_count = 0
            else:
                median_count = 1

            raw = raw_dict[key]
            # File exists riven already in file
            if key in total_dict:
                total = total_dict[key]
                total["itemType"] = raw["itemType"]
                total["compatibility"] = raw["compatibility"]
                total["rerolled"] = raw["rerolled"]
                total["total_avg"] += raw["avg"]
                total["total_stddev"] += raw["stddev"]
                total["total_min"] += raw["min"]
                total["total_max"] += raw["max"]
                total["total_pop"] += raw["pop"]
                total["total_sales"] += raw["pop"] * sales / 100
                total["total_median"] += raw["median"]
                total["median_count"] += median_count
                total["count"] += 1

            # File exists riven not in file
            else:
                total_dict[key] = {
                    "itemType": raw["itemType"],
                    "compatibility": raw["compatibility"],
                    "rerolled": raw["rerolled"],
                    "total_avg": raw["avg"],
                    "total_stddev": raw["stddev"],
                    "total_min": raw["min"],
                    "total_max": raw["max"],
                    "total_pop": raw["pop"],
                    "total_sales": raw["pop"] * sales / 100,
                    "total_median": raw["median"],
                    "median_count": median_count,
                    "count": 1,
                }
        total_file = []
        total_file.append(dates)

        d_l = []
        for key in list(total_dict.keys()):
            total = total_dict[key]
            d_l.append({
                "itemType": total["itemType"],
                "compatibility": total["compatibility"],
                "rerolled": total["rerolled"],
                "total_avg": total["total_avg"],
                "total_stddev": total["total_stddev"],
                "total_min": total["total_min"],
                "total_max": total["total_max"],
                "total_pop": total["total_pop"],
                "total_sales": total["total_sales"],
                "total_median": total["total_median"],
                "median_count": total["median_count"],
                "count": total["count"]
            })
        total_file.append(d_l)

    # File doesn't exist
    except FileNotFoundError:
        print(f"No TOTAL_{platform} found creating it!")
        # Adds the date into the first list
        total_file = []
        total_file.append([date])

        # Data list
        d_l = []
        for key in list(raw_dict.keys()):
            raw = raw_dict[key]

            if raw_dict[key]["median"] == 0:
                median_count = 0
            else:
                median_count = 1

            d_l.append({
                "itemType": raw["itemType"],
                "compatibility": raw["compatibility"],
                "rerolled": raw["rerolled"],
                "total_avg": raw["avg"],
                "total_stddev": raw["stddev"],
                "total_min": raw["min"],
                "total_max": raw["max"],
                "total_pop": raw["pop"],
                "total_sales": (raw["pop"] * sales) / 100,
                "total_median": raw["median"],
                "median_count": median_count,
                "count": 1
            })

        total_file.append(d_l)
        total_dict = create_dict(total_file, 3)
    print(f"Saving TOTAL_{platform}.json\n")

    with open(total_path, "w") as file:
        json.dump(total_file, file, indent=4)
    return total_dict


# Does all of the comparisons
def comparison(platform, raw_dict, total_dict, sales, filename):
    edited_list = []
    for key in list(raw_dict.keys()):
        total = total_dict[key]
        raw = raw_dict[key]

        # First 2 weeks don't have median this handles it
        try:
            median = raw["Median"]
            total_median = total["total_median"]
            median_count = total["median_count"]
            if median_count == 0:
                median_diff = 0
            else:
                median_diff = median - (total_median / median_count)
        except KeyError:
            median = 0
            median_diff = 0

        current_sales = (sales * raw["pop"]) / 100
        try:
            avg_diff = raw["avg"] - ((total["total_avg"] - raw["avg"]) / (total["count"] - 1))
            stddev_diff = raw["stddev"] - ((total["total_stddev"] - raw["stddev"]) / (total["count"] - 1))
            min_diff = raw["min"] - ((total["total_min"] - raw["min"]) / (total["count"] - 1))
            max_diff = raw["max"] - ((total["total_max"] - raw["max"]) / (total["count"] - 1))
            pop_diff = raw["pop"] - ((total["total_pop"] - raw["pop"]) / (total["count"] - 1))
            sales_diff = current_sales - ((total["total_sales"] - current_sales) / (total["count"] - 1))
        except ZeroDivisionError:
            avg_diff = 0
            stddev_diff = 0
            min_diff = 0
            max_diff = 0
            pop_diff = 0
            sales_diff = 0

        edited_list.append({
            "itemType": raw["itemType"],
            "compatibility": raw["compatibility"],
            "rerolled": raw["rerolled"],
            "avg": raw["avg"],
            "avg_diff": avg_diff,
            "stddev": raw["stddev"],
            "stddev_diff": stddev_diff,
            "min": raw["min"],
            "min_diff": min_diff,
            "max": raw["max"],
            "max_diff": max_diff,
            "pop": raw["pop"],
            "pop_diff": pop_diff,
            "median": raw["median"],
            "median_diff": median_diff,
            "sales": current_sales,
            "sale_diff": sales_diff
        })

    edited_path = EDIT_PATH.format(platform) + filename
    with open(edited_path, "w") as file:
        json.dump(edited_list, file, indent=4)
    print(f"Saved {filename} Edited\n-----------------\n")


# Creates a dictoniary with name as key and the data as a value for easy use
def create_dict(data, mode):
    '''Creates the usefull dicts
    Mode 1 for raw data
    Mode 2 for edited data
    Mode 3 for Total data'''
    data_dict = {}
    if mode == 1:
        for d in data:

            # Creates the name for the riven
            if d["compatibility"] is None:
                name = f"Veiled {d['itemType']}"
            elif d["rerolled"]:
                name = f"{d['compatibility']}_T"
            else:
                name = f"{d['compatibility']}_F"

            # Older data doesn't have median
            try:
                median = d["median"]
            except KeyError:
                median = 0

            data_dict[name] = {
                "itemType": d["itemType"],
                "compatibility": d["compatibility"],
                "rerolled": d["rerolled"],
                "avg": d["avg"],
                "stddev": d["stddev"],
                "min": d["min"],
                "max": d["max"],
                "pop": d["pop"],
                "median": median
            }
    if mode == 2:
        for d in data:

            # Creates the name for the riven
            if d["compatibility"] is None:
                name = f"Veiled {d['itemType']}"
            elif d["rerolled"]:
                name = f"{d['compatibility']}_T"
            else:
                name = f"{d['compatibility']}_F"

            data_dict[name] = {
                "itemType": d["itemType"],
                "compatibility": d["compatibility"],
                "rerolled": d["rerolled"],
                "avg": d["avg"],
                "avg_diff": d["avg_diff"],
                "stddev": d["stddev"],
                "stddev_diff": d["stddev_diff"],
                "min": d["min"],
                "min_diff": d["min_diff"],
                "max": d["max"],
                "max_diff": d["max_diff"],
                "pop": d["pop"],
                "pop_diff": d["pop_diff"],
                "median": d["median"],
                "median_diff": d["median_diff"],
                "sales": d["sales"],
                "sales_diff": d["sales_diff"]
            }
    if mode == 3:
        for d in data[1]:

            # Creates the name for the riven
            if d["compatibility"] is None:
                name = f"Veiled {d['itemType']}"
            elif d["rerolled"]:
                name = f"{d['compatibility']}_T"
            else:
                name = f"{d['compatibility']}_F"

            data_dict[name] = {
                "itemType": d["itemType"],
                "compatibility": d["compatibility"],
                "rerolled": d["rerolled"],
                "total_avg": d["total_avg"],
                "total_stddev": d["total_stddev"],
                "total_min": d["total_min"],
                "total_max": d["total_max"],
                "total_pop": d["total_pop"],
                "total_sales": d["total_sales"],
                "total_median": d["total_median"],
                "median_count": d["median_count"],
                "count": d["count"]
            }
    return data_dict


# Sorts the TOTAL dict because of how awkward the API data is
def dict_sort(dict):
    pass


if __name__ == '__main__':
    L_MONDAY = last_monday()
    for p in PLATFORMS:
        print(f"\n-----------------\n     {p}     \n-----------------\n")
        get_riven_json(p)
        process_data(p)
