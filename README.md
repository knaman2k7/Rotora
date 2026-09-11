## Important Meta-Information about system

Store opening times:
Monday - Saturday: 10am to 8pm
Sunday: 12pm to 6pm

8 hour shifts have 1 hour lunch
6 hour shifts have no lunch(for simplicity sake)

Monday - Saturday has 4 type of shifts available:
morning 8 hour: 10am to 7pm
morning 6 hour: 10am to 4pm
evening 8 hour: 11am to 8pm
evening 6 hour: 2pm to 8pm

Sunday has 2 type of shifts available:
9am to 6pm(used by manager/assistant-manager/supervisor)
12pm to 6pm(part-time)

Employees are of the categories:
- Manager(Full Time)
- Assistant Manager(Full Time)
- Supervisor(Full Time)
- Keyholder(Part Time)
- Sales-Advisor(Part Time)

Full time employees can only do 8 hour shifts
Part time employees can do 6 or 8 hour shifts


## Shift Encoding

Shift encoding stored in database (xy):
x = day -- Monday = 1; Tuesday = 2...
y = shift type -- morning 8 hour = 1; morning 6 hour = 2; evening 8 = 3; evening 6 = 4 / for sunday 8 hour

Shifts, when employees are NOT available, are stored in the database as constraints

Employees have two types of constraints within the database:
- specific -- specific constraints given for a specific week
- default -- constraints assumed for every week, if specific constraint not given for given week


## Week's Constraints encoding

The rota's structure also is a constraint, these include:
- how many total hours in the week are given - (this can be controlled by how many 6 or 8 hour shifts are allocated)

#### Constraint 1 - week's shifts structure

A day can have varible employees doing a shift, examples days include - but are not limited to:
- 2 x morning 8 hours + 1 x evening 8 hours
- 2 x morning 8 hours + 2 x evening 8 hours

rota constraints are stored in the database as (nxy):
n = number of people doing that shift
xy = normal shift encoding

#### Constraint 2 - specific employee on specific shift

A specific employee could be wanted for a specific shift throughout the week

this is encoded as xy(id) using xy * 100 + id:
xy = shift encoding
id = employee_id in database



## Front-end - employee constraints

All shifts are assumed available for any employee, until unavailability for specific shift type is selected by user

if an employee is not available for:
- morning 6 hour shift, they are transatively not available for morning 8 hour shift
- evening 6 hour shift, they are transatively not available for morning 8 hour shift
So, when the 6 hour shift is selected to show unavailability, the 8 hour shift should also become unavailable


