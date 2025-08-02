# Watch Later MongoDB API - Postman Test Suite

## 📋 **Overview**
This Postman collection provides comprehensive testing for the Watch Later MongoDB API endpoints. It includes tests for all CRUD operations, error handling, and edge cases.

## 🚀 **Setup Instructions**

### 1. **Import the Collection**
1. Open Postman
2. Click **Import** button
3. Select **File** tab
4. Choose `WatchLater_API_Tests.postman_collection.json`
5. Click **Import**

### 2. **Configure Environment Variables**
The collection uses a `baseUrl` variable set to `http://localhost:4800`. If your server runs on a different port, update this variable:

1. Click on the collection name
2. Go to **Variables** tab
3. Update `baseUrl` if needed
4. Click **Save**

### 3. **Ensure Server is Running**
Make sure your Node.js server is running on port 4800:
```bash
cd server
npm start
```

## 🧪 **Test Suite Structure**

### **Basic Operations (Tests 1-4)**
- **1. Collection Info** - Get basic collection statistics
- **2. Get All Items** - Retrieve all watch later items
- **3. Get Movies Only** - Filter by movie type
- **4. Get TV Shows Only** - Filter by TV show type

### **CRUD Operations (Tests 5-8)**
- **5. Add Movie** - Add a new movie to watch later
- **6. Add TV Show** - Add a new TV show episode
- **7. Update Progress** - Update viewing progress
- **8. Remove Item** - Remove an item from watch later

### **Advanced Operations (Tests 9-10)**
- **9. Bulk Import Test** - Test bulk data import
- **10. Clear All Items** - Clear entire collection

### **Error Handling (Tests 11)**
- **Add Invalid Item** - Test validation with missing fields
- **Update Non-existent Item** - Test updating non-existent item
- **Remove Non-existent Item** - Test removing non-existent item

## 🎯 **Running Tests**

### **Individual Tests**
1. Select any test from the collection
2. Click **Send**
3. Review response and test results

### **Run Entire Collection**
1. Right-click on collection name
2. Select **Run collection**
3. Click **Run Watch Later MongoDB API Tests**

### **Automated Test Runner**
1. Click **Runner** button in Postman
2. Select the collection
3. Configure iterations and delays
4. Click **Run**

## 📊 **Expected Test Results**

### **Successful Responses**
- Status code: 200
- Response time: < 1000ms
- Valid JSON format
- Appropriate success messages

### **Error Responses**
- Status code: 400 (for validation errors)
- Status code: 404 (for not found)
- Descriptive error messages

## 🔍 **Test Data Validation**

### **Collection Info Response**
```json
{
  "timestamp": "2025-07-31T19:31:27.614Z",
  "itemCount": 20,
  "movieCount": 13,
  "tvShowCount": 7,
  "createdAt": "2025-07-31T19:31:27.614Z",
  "updatedAt": "2025-07-31T19:36:25.008Z"
}
```

### **Add Item Response**
```json
{
  "success": true,
  "message": "Item added to watch later",
  "itemCount": 21,
  "item": {
    "mediaId": "postman_test_movie_001",
    "mediaType": "movie",
    "title": "Postman Test Movie",
    // ... other fields
  }
}
```

## 🛠 **Customizing Tests**

### **Adding New Test Cases**
1. Right-click on collection
2. Select **Add request**
3. Configure method, URL, headers, and body
4. Add test scripts in the **Tests** tab

### **Modifying Test Data**
Update the JSON payloads in each request to test different scenarios:
- Different media types
- Various file paths
- Different progress values
- Edge cases

### **Environment-Specific Testing**
Create different environments for:
- Development (localhost:4800)
- Staging (your-staging-server)
- Production (your-production-server)

## 📝 **Test Scripts**

The collection includes automated test scripts that validate:
- HTTP status codes
- Response format
- Response time
- Data structure

### **Custom Test Scripts**
Add specific validations in the **Tests** tab:

```javascript
// Example: Validate item count increases after adding
pm.test("Item count increased", function () {
    const response = pm.response.json();
    pm.expect(response.itemCount).to.be.above(0);
});

// Example: Validate required fields
pm.test("Response has required fields", function () {
    const response = pm.response.json();
    pm.expect(response).to.have.property('success');
    pm.expect(response).to.have.property('message');
});
```

## 🔄 **Test Workflow**

### **Recommended Test Order**
1. Start with **Collection Info** to verify API is accessible
2. Run **Get All Items** to see current state
3. Test **Add Movie** and **Add TV Show**
4. Verify with **Get Movies Only** and **Get TV Shows Only**
5. Test **Update Progress**
6. Test **Remove Item**
7. Test **Bulk Import**
8. Run **Error Tests** to verify validation
9. End with **Clear All Items** (optional)

### **Data Cleanup**
- Use **Clear All Items** to reset the collection
- Or manually remove test items using **Remove Item**

## 🚨 **Troubleshooting**

### **Common Issues**
1. **Connection Refused** - Ensure server is running on port 4800
2. **404 Errors** - Check API endpoint paths
3. **Validation Errors** - Verify JSON payload format
4. **Timeout Errors** - Check server performance

### **Debug Mode**
Enable Postman console to see detailed request/response logs:
1. View → Show Postman Console
2. Run tests and review logs

## 📈 **Performance Testing**

### **Load Testing**
1. Use Postman Runner with multiple iterations
2. Monitor response times
3. Test concurrent requests
4. Verify MongoDB performance

### **Stress Testing**
- Send large bulk imports
- Test with maximum data sizes
- Verify error handling under load

## 🎉 **Success Criteria**

Tests are considered successful when:
- ✅ All endpoints return 200 status codes
- ✅ Response times are under 1000ms
- ✅ Data is correctly stored and retrieved
- ✅ Error handling works as expected
- ✅ Bulk operations complete successfully
- ✅ No data corruption occurs

---

**Happy Testing! 🚀** 