# Findeks Credit Eligibility

Findeks is a credit scoring system used to verify customer eligibility for car rental services. This integration helps
assess customer creditworthiness before completing rental reservations, reducing financial risks for both agencies and
rental companies.

## Overview

The Findeks integration provides a comprehensive credit verification workflow that includes:

- **Credit Eligibility Check**: Quick verification of customer credit status
- **Phone Number Verification**: Multi-step authentication using customer's registered phone numbers
- **Credit Report Generation**: Detailed credit assessment for qualified customers
- **PIN-based Security**: SMS-based verification for secure credit reporting


## Integration Workflow

The complete Findeks verification process follows these steps:


```
1. Initial Check      â†’ /findeks/check
2. Get Phone List     â†’ /findeks/phone-list (if needed)
3. Generate Report    â†’ /findeks/report (if Unknown status)
4. Confirm PIN        â†’ /findeks/pin-confirm
5. Renew PIN          â†’ /findeks/pin-renew (if expired)
6. Final Verification â†’ /findeks/check (recheck status)
```

### Workflow Decision Tree

- **Positive/Positive With Young Driver** â†’ Approve rental
- **Negative** â†’ Reject rental
- **Unknown** â†’ Continue with phone verification and report generation


## Authentication

All Findeks endpoints require bearer token authentication:


```
Authorization: Bearer YOUR_ACCESS_TOKEN
```

## API Endpoints

### Check Credit Eligibility

Performs an initial credit eligibility check for a customer.

#### Endpoint


```
POST /findeks/check
```

#### Request Body

| Field | Type | Required | Description |
|  --- | --- | --- | --- |
| `identityNumber` | string | Yes | Customer's national identity number |
| `integrationCode` | string | Yes | Integration tracking code from search result |


#### Example Request


```bash
curl -X POST https://api.pro.yolcu360.com/api/v1/findeks/check \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "identityNumber": "11223344556",
    "integrationCode": "integrationCode123"
  }'
```

#### Response

**Success Response (200 OK):**


```json
{
  "status": "Positive"
}
```

**Possible Status Values:**

- `"Positive"` - Customer approved for rental
- `"Negative"` - Customer rejected for rental
- `"Unknown"` - Additional verification required
- `"Positive With Young Driver"` - Approved with young driver conditions


**Error Responses:**

- `400 Bad Request` - Invalid request format or validation error
- `401 Unauthorized` - Invalid or missing access token
- `500 Internal Server Error` - Server error


### Get Customer Phone List

Retrieves registered phone numbers for a customer to use in verification process.

#### Endpoint


```
POST /findeks/phone-list
```

#### Request Body

| Field | Type | Required | Description |
|  --- | --- | --- | --- |
| `identityNumber` | string | Yes | Customer's national identity number |
| `integrationCode` | string | Yes | Integration tracking code from search result |


#### Example Request


```bash
curl -X POST https://api.pro.yolcu360.com/api/v1/findeks/phone-list \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "identityNumber": "11223344556",
    "integrationCode": "integrationCode123"
  }'
```

#### Response

**Success Response (200 OK):**


```json
{
  "phoneList": [
    {
      "key": 711957237,
      "phone": "533*****36"
    },
    {
      "key": 711957238,
      "phone": "505*****42"
    }
  ]
}
```

**Response Fields:**

- `key` - Unique identifier for the phone number (used in report generation)
- `phone` - Masked phone number for privacy protection


### Generate Credit Report

Creates a detailed Findeks credit report using complete customer information.

#### Endpoint


```
POST /findeks/report
```

#### Request Body

| Field | Type | Required | Description |
|  --- | --- | --- | --- |
| `identityNumber` | string | Yes | Customer's national identity number |
| `birthDate` | string (date) | Yes | Customer's birth date (YYYY-MM-DD) |
| `driverLicenseDate` | string (date) | Yes | Driver license issue date (YYYY-MM-DD) |
| `phone` | string | Yes | Customer's phone number (E.164 format) |
| `phoneKey` | integer | Yes | Phone key from phone list response |
| `integrationCode` | string | Yes | Integration tracking code from search result |


#### Example Request


```bash
curl -X POST https://api.pro.yolcu360.com/api/v1/findeks/report \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "identityNumber": "45473452",
    "birthDate": "1994-01-15",
    "driverLicenseDate": "2012-03-20",
    "phone": "+905554443322",
    "phoneKey": 123,
    "integrationCode": "integrationCode123"
  }'
```

#### Response

**Success Response (200 OK):**


```json
{
  "findeksCode": 182783973
}
```

**Response Fields:**

- `findeksCode` - Generated code for the credit report (used for PIN confirmation)


**Note:** After successful report generation, a PIN will be sent to the customer's phone number for verification.

### Confirm PIN

Confirms the PIN sent to customer's phone to authorize the credit check process.

#### Endpoint


```
POST /findeks/pin-confirm
```

#### Request Body

| Field | Type | Required | Description |
|  --- | --- | --- | --- |
| `findeksCode` | string | Yes | Findeks code from report generation |
| `pinCode` | string | Yes | PIN code received via SMS |
| `integrationCode` | string | Yes | Integration tracking code from search result |


#### Example Request


```bash
curl -X POST https://api.pro.yolcu360.com/api/v1/findeks/pin-confirm \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "findeksCode": "45473452",
    "pinCode": "123456",
    "integrationCode": "integrationCode123"
  }'
```

#### Response

**Success Response (204 No Content):**

No response body. A 204 status indicates successful PIN confirmation.

**Error Responses:**

- `400 Bad Request` - Invalid PIN or request format
- `401 Unauthorized` - Invalid or missing access token
- `500 Internal Server Error` - Server error


### Renew PIN

Requests a new PIN when the original PIN has expired or was not received.

#### Endpoint


```
POST /findeks/pin-renew
```

#### Request Body

| Field | Type | Required | Description |
|  --- | --- | --- | --- |
| `findeksCode` | string | Yes | Findeks code from report generation |
| `integrationCode` | string | Yes | Integration tracking code from search result |


#### Example Request


```bash
curl -X POST https://api.pro.yolcu360.com/api/v1/findeks/pin-renew \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "findeksCode": "45473452",
    "integrationCode": "integrationCode123"
  }'
```

#### Response

**Success Response (204 No Content):**

No response body. A 204 status indicates successful PIN renewal.

**Error Responses:**

- `400 Bad Request` - Invalid request format
- `401 Unauthorized` - Invalid or missing access token
- `500 Internal Server Error` - Server error


## Complete Integration Example

Here's a complete workflow implementation example:


```javascript
async function performFindeksVerification(customerData) {
    const {identityNumber, integrationCode, birthDate, driverLicenseDate, phone} = customerData;

    try {
        // Step 1: Initial eligibility check
        const initialCheck = await checkFindeksEligibility(identityNumber, integrationCode);

        if (initialCheck.status === 'Positive' || initialCheck.status === 'Positive With Young Driver') {
            return {approved: true, status: initialCheck.status};
        }

        if (initialCheck.status === 'Negative') {
            return {approved: false, status: 'Negative'};
        }

        // Step 2: For Unknown status, get phone list
        if (initialCheck.status === 'Unknown') {
            const phoneList = await getFindeksPhoneList(identityNumber, integrationCode);

            // Step 3: Generate report with selected phone
            const selectedPhone = phoneList.phoneList[0]; // User selects appropriate phone
            const report = await generateFindeksReport({
                identityNumber,
                birthDate,
                driverLicenseDate,
                phone,
                phoneKey: selectedPhone.key,
                integrationCode
            });

            // Step 4: Get PIN from user and confirm
            const pinCode = await getPinFromUser(); // Implementation depends on UI
            await confirmFindeksPin(report.findeksCode, pinCode, integrationCode);

            // Step 5: Recheck status after PIN confirmation
            // Note: Status update may take up to 1 minute
            await waitForStatusUpdate();
            const finalCheck = await checkFindeksEligibility(identityNumber, integrationCode);

            return {
                approved: finalCheck.status.startsWith('Positive'),
                status: finalCheck.status
            };
        }

    } catch (error) {
        if (error.message.includes('PIN')) {
            // Handle PIN renewal if needed
            await renewFindeksPin(findeksCode, integrationCode);
            return performFindeksVerification(customerData); // Retry
        }
        throw error;
    }
}

async function checkFindeksEligibility(identityNumber, integrationCode) {
    const response = await fetch('/api/v1/findeks/check', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({identityNumber, integrationCode})
    });

    if (!response.ok) throw new Error('Findeks check failed');
    return response.json();
}

async function waitForStatusUpdate() {
    // Wait for status update (can take up to 1 minute)
    return new Promise(resolve => setTimeout(resolve, 60000));
}
```

## Error Handling

### Common Error Codes

| Code | Description |
|  --- | --- |
| 1001 | Error while parsing payload |
| 1002 | Validation error |
| 1003 | Parameter error |
| 2001 | Unauthorized |
| 2002 | Forbidden |
| 5001 | Agency configuration not found |


### Best Practices

1. **Handle Async Status Updates**: After PIN confirmation, status updates can take up to 1 minute
2. **Implement Retry Logic**: Handle PIN renewal scenarios gracefully
3. **Secure PIN Handling**: Never log or store PIN codes
4. **Error Recovery**: Implement proper error handling for each step
5. **User Experience**: Provide clear feedback during the verification process
6. **Timeout Handling**: Set appropriate timeouts for PIN entry


## Security Considerations

### Data Privacy

- Never store or log customer identity numbers or PIN codes
- Handle sensitive data according to GDPR and local privacy regulations
- Use HTTPS for all API communications


### Implementation Security

- Validate all input parameters before API calls
- Implement proper session management for multi-step verification
- Use secure storage for temporary verification state
- Clear sensitive data from memory after use


## Troubleshooting

### Common Issues

**Unknown Status Persists**

- Ensure all required customer information is accurate
- Verify phone number format (E.164)
- Check that PIN confirmation was successful


**PIN Not Received**

- Use the PIN renewal endpoint
- Verify phone number is correct and active
- Check for SMS delivery delays


**Verification Timeout**

- Implement retry logic with exponential backoff
- Check API rate limits
- Verify integration code is valid for the session


### Testing Recommendations

- Test with various identity numbers to understand different status responses
- Implement proper error handling for network timeouts
- Test PIN renewal scenarios
- Verify status update timing in different environments