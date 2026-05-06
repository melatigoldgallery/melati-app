# 🧪 Testing Quick Start

## 5 Menit: Verify Hard Cutover Works Locally

### Step 1: Unit Tests ✅

```bash
npm.cmd test
```

**Expected:** 6/6 passing (floor-config, floor-math, hard-cutover smoke tests)

---

### Step 2: Start Dev Server

```bash
npm.cmd run dev
```

**Open:** http://localhost:5173/login

---

### Step 3: Login & Verify Floor Selection

1. Select floor: **Lt 1** (L1)
2. Enter credentials
3. ✅ Check header shows "Lt 1" badge

---

### Step 4: Test Hard Cutover Reads (Pick One Module)

#### Option A: Order Module

- Navigate to **Data Pesanan** or **Manajemen Order**
- Select date range
- ✅ Orders should appear (from floors/L1/order_online OR order_online legacy)

#### Option B: Servis Module

- Navigate to **Data Servis**
- ✅ Servis list loads automatically

#### Option C: Stock/Aksesoris

- Navigate to **Penjualan Aksesoris**
- Click **Tambah Item** → opens catalog
- ✅ Items appear in dropdown

---

### Step 5: Verify Floor Writes (Create New Entry)

1. Create new order/servis in any module
2. Open **Firebase Console** → **Firestore Database**
3. Check floor-scoped path exists with same data:
   - ✅ `floors/L1/order_online/{id}`

---

## ✅ Testing Passed If:

- [x] 6/6 unit tests passing
- [x] Build compiles (479 modules)
- [x] Login with floor selection works
- [x] Orders/Servis/Stock load without errors
- [x] New documents appear in floor-scoped paths
- [x] No "Could not read" errors in console

---

## 🚀 Ready for Production!

If all above ✅, code is ready to deploy to Firebase Hosting.

---

## 📊 Full Testing Documentation

See:

- [TESTING-HARD-CUTOVER.md](TESTING-HARD-CUTOVER.md) — Detailed testing strategy
- [QUICK-TESTING-CHECKLIST.js](QUICK-TESTING-CHECKLIST.js) — Browser console commands
- [HARD-CUTOVER-DEPLOYMENT.md](HARD-CUTOVER-DEPLOYMENT.md) — Deployment steps

---

## 🔗 Key Test Points

| Feature         | Test         | Expected                       |
| --------------- | ------------ | ------------------------------ |
| Hard Cutover    | Load orders  | From floor-scoped OR legacy ✅ |
| Floor Writes    | Create order | Appears in floors/L1 ✅        |
| Floor Selection | Login        | Header shows "Lt 1" ✅         |
| Fallback Logic  | Empty floor  | Reads from legacy ✅           |
| Performance     | List load    | < 1s for 50 items ✅           |

---

## 🆘 Quick Troubleshooting

| Issue                               | Check             | Fix                     |
| ----------------------------------- | ----------------- | ----------------------- |
| Orders not loading                  | Network tab       | Check Firestore errors  |
| Floor write missing                 | Firestore Console | Verify floor doc exists |
| Floor selection broken              | sessionStorage    | Check activeFloor value |
| Hard cutover not prioritizing floor | Console logs      | Add debug logging       |
