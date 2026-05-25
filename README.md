# 🌍 Smart Water Ghana – Pilot Dashboard & Admin Panel

![Build Status](https://img.shields.io/badge/build-passing-brightgreen)
![License](https://img.shields.io/badge/license-MIT-blue)
![Contributors](https://img.shields.io/github/contributors/yourusername/smart-water-ghana)
![Last Commit](https://img.shields.io/github/last-commit/yourusername/smart-water-ghana)
![Issues](https://img.shields.io/github/issues/yourusername/smart-water-ghana)

---

## Vision
Empowering Ghanaian communities with tech-enabled water solutions that are **affordable, scalable, and dignified**.  
The project aims to curb household water wastage and preserve resources so water can be distributed effectively to areas with little or no access.

---

## Baseline Problem
- Many households in Ghana waste water due to leaks, overuse, or lack of monitoring.  
- Communities with limited access suffer while excess water is lost.  
- Current GWCL meters do not provide real-time feedback or smart controls.

---

## Project Goals
- Monitor household water usage in real-time.  
- Detect and alert leaks early.  
- Enable Mobile Money payments directly from the dashboard.  
- Collect feedback from pilot users.  
- Provide an admin panel for household and system management.  
- Introduce smart cutoff logic at GWCL meters when quotas are exceeded.  
- Redistribute saved water to underserved communities.  

---

## Project Structure


---

## Features Implemented

### Dashboard
- Real-time household water usage (simulated).  
- Leak alerts (simulated after delay).  
- Mobile Money payment button (placeholder).  
- Feedback form with submission handling.  

### Admin Panel
- Manage households (add, view usage reports).  
- Display system alerts (simulated).  
- Consistent styling with dashboard.  

### Persistent Storage
- Households, feedback, and alerts saved in `localStorage`.  
- Data reloads automatically after refresh.  

---

## Suggested Enhancements

### 1. Tiered Usage Limits
- Assign quotas per household.  
- Apply higher tariffs when exceeding quota.  
- Show warnings before cutoff.  

### 2. Leak Detection Sensors
- IoT sensors detect leaks.  
- Alerts shown on dashboard/admin.  
- Option to resolve leaks.  

### 3. Smart Billing
- Link usage directly to billing.  
- Real-time cost display.  
- Mobile Money integration.  

### 4. Community Redistribution
- Track water saved from conservation.  
- Redirect excess to low-supply areas.  
- Show impact on dashboard.  

### 5. Gamification & Rewards
- Award badges for conservation.  
- Track streaks of mindful usage.  
- Leaderboard for households.  

### 6. Behavioral Nudges
- Daily water-saving tips.  
- Rotate tips randomly.  
- Admin can add/edit tips.  

---

## Smart Meter Cutoff Logic
- **Thresholds**: Automatically shut off water when quota is exceeded.  
- **Notifications**: SMS/app alerts before cutoff.  
- **Overrides**: Emergency override for hospitals, schools, vulnerable households.  

---

## User Experience
- **Dashboard**: Feels empowering — households see usage, costs, and conservation impact.  
- **Admin Panel**: Provides control — manage households, monitor alerts, redistribute water.  
- **Persistence**: Data continuity across sessions makes the pilot realistic.  

---

## Next Steps
- Integrate IoT sensors for real-time leak detection.  
- Connect to GWCL smart meters for cutoff logic.  
- Expand Mobile Money integration for live billing.  
- Pilot test with selected households in Accra.  

---

## License
This project is licensed under the MIT License. See the LICENSE file for details.
