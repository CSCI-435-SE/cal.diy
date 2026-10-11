## Tool Info

Tool name: `DBeaver`
Tool version: Latest release (`26.2.2`)
[Link to tool](https://dbeaver.io/download/)

## What problem does DBeaver solve?

When one is working on a large database, it quickly becomes impractical to use database commands for browsing the database contents and making changes. (ie if you want to grab a specific user, `SELECT * FROM users WHERE user_id=881c9452-a9b4-4c7a-bcfe-a9b2fb49cc43` quickly becomes time consuming to do). With DBeaver, a developer can explore the database in a graphical way. DBeaver automatically executes the relevant queries to get the information displayed in DBeaver's GUI. 

## Setup

### Installation
To install DBeaver, the developer simply needs to visit the DBeaver website and download Community Edition. The setup is basically the same across different operating systems.

### Adding a connection
To add a connection, the developer needs to press the plug icon in the top left of the window, this will open a pop-up that displays the database connections supported. For our project, the developer needs to click on `PostgreSQL`. The user is then asked to enter the details about which Postgres server to connect to. Even though our Postgres database runs in a Docker container, it still binds to the localhost address. The main connection URL setting that needs to be changed is the port, which is `5450` instead of the default Postgres port of `5432`.

Our project has a default database name of `calendso` and a password of `magical_password`, which for development is okay to have. The user is the default `postgres` user.

### Viewing the database
Postgres databases are ordered by `connection > database > schema`, so in order for the developer to access the tables with the data, they must navigate to `connection > Databases > calendso > Schemas > public > Tables` where `Tables` contains the database tables. They can then double-click on the tables to open the data viewer.

### Viewing relation graph
It may be useful to see how all the database keys connect. Because Postgres is a relational database, it has foreign keys that reference keys in other tables. This can be viewed using `View Diagram` button when right-clicking on the `public` schema.

## When to use DBeaver
You should be using DBeaver whenever you need to perform slightly-more-than-trivial operations. In fact, you can still execute raw database queries *within* DBeaver, so with it installed, there should be very little reason to ever drop into a raw CLI database engine. DBeaver Community Edition is *free and open source*, so there is no excuse to not implement DBeaver into your current or next database-related endeavors.

## Link to tutorial video
