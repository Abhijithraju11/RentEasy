# RentEasy – Student Rental Platform

RentEasy is a simplified, lightweight web application designed to connect students with property owners for finding and managing rental listings.

## Features

### Student Features
- **Authentication**: Register & Login as a Student.
- **Browse Properties**: View rental listings in a modern dashboard.
- **Search & Filter**: Search properties by location and filter them by monthly rent or property type (Hostel/PG/House).
- **View Details**: Open a detailed view of a property to read descriptions, check rent, and retrieve the owner's contact number.

### Owner Features
- **Authentication**: Register & Login as an Owner.
- **Dashboard**: Access an Owner panel showing only the owner's listed properties.
- **Manage Listings**: Add new properties, edit property details, and delete properties.

---

## Tech Stack
- **Frontend**: React.js (via Vite)
- **Backend**: Node.js + Express.js
- **Database**: MongoDB (with local JSON file fallback if MongoDB is not running)
- **Authentication**: JWT (JSON Web Tokens)
- **Image Upload**: Supports Cloudinary (with local upload fallback)
- **Styling**: Premium Custom Vanilla CSS

---

## Setup Instructions

### Prerequisites
- Node.js installed on your machine.
- Git (optional, for version control).

### Quick Start
1. Install dependencies for the root, backend, and frontend:
   ```bash
   npm run install-all
   ```
2. Start both the backend and frontend concurrently in development mode:
   ```bash
   npm run dev
   ```
3. Open your browser and navigate to `http://localhost:5173`.
