StudioFlow – Service Scheduling & Business Management Application (Frontend)

StudioFlow is a web application designed for service-based businesses such as hair salons, massage studios, chiropractic clinics, dental offices, and similar companies that provide services to clients.

The application digitizes daily operations — from appointment scheduling to financial overview — replacing manual booking notebooks and calculator-based financial tracking.

🔍 Problem Statement

Many service-based businesses still rely on:

manual appointment scheduling (notebooks, paper calendars),

time-consuming search for available time slots,

inaccurate income and expense tracking,

frequent scheduling conflicts and human errors.

StudioFlow addresses these problems by providing:

a centralized digital scheduling system,

automatic discovery of available time slots,

structured financial tracking (income & expenses),

clearly defined user roles and permissions.

👨‍💻 My Role

StudioFlow is a personal full-stack project (this repository contains the frontend part), created to simulate a real production-ready system.

I was responsible for:

frontend architecture and application structure,

implementation of business logic (appointments, roles, finances),

UI/UX development,

authentication and data validation,

communication with backend services.

👥 User Roles & Permissions
👑 Owner (Company Administrator)

add, remove, and update services

manage service pricing

view and manage all appointments

book appointments on behalf of employees

full access to financial overview

👤 Employee

book appointments only for themselves

view personal schedule

no permission to manage services or pricing

This role-based system reflects real organizational structures and access control within service-based companies.

✨ Key Features

📅 Appointment scheduling with calendar view

⚡ Fast booking system
(automatically finds the first available time slot for a selected service)

👥 Role-based access control

💰 Automatic financial calculations

📊 Financial overview by day, month, and year

➕ Income from services and expenses
(rent, utilities, invoices, etc.)

🔔 Email and SMS notifications

🔐 Authentication with form validation

📱 Fully responsive design

🧮 Financial Logic Overview

The financial module works by:

retrieving all completed reservations up to the current date from the database,

calculating total income based on provided services,

subtracting recorded expenses (rent, utilities, invoices),

presenting financial data grouped by:

daily

monthly

yearly periods

This approach provides a realistic and up-to-date overview of business performance.

🛠️ Tech Stack (Frontend)

React

Next.js

Tailwind CSS

Zod – form validation (login flow)

The backend/API is currently developed locally and is not publicly available.
The application is designed as part of a full-stack system.

🌍 Internationalization (i18n)

The application UI is currently available in Serbian.
Internationalization (i18n) support is planned as a future improvement.

📸 Screenshots / Demo

(Add application screenshots here)
Recommended:

appointment calendar

financial dashboard

service management (owner view)

If a live demo becomes available, add the link at the top of this section.

📚 What I Learned

modeling real-world business processes in an application

implementing role-based access control

handling time-based and financial logic

building a scalable frontend architecture

thinking about applications as products, not just code

🚀 Running the Project Locally
npm install
npm run dev

🔮 Future Improvements

extracting backend API into a separate repository

extended financial analytics and reports

additional automation and notifications

performance and UX optimizations

🧠 Why This Project Matters

StudioFlow was built to solve real problems faced by service-based businesses, with a strong focus on:

clean architecture

realistic business logic

maintainable and scalable frontend code
