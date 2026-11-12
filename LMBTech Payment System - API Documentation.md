# LMBTech Payment System - API Documentation

System Overview..   
Authentication..   
Making Payments (Collections.)...   
Sending Money(Payouts... .6   
Callback Implementation.. .8   
Error Handling.... 11   
Testing.... 12   
Quick Reference ... 13

# System Overview

The LMBTech Payment System allows you to:

. Collect money from customers via Mobile Money (MTN MOMO) or Card   
. Send money to customers (payouts)   
. Check payment status in real-time   
. Receive instant notifications via callbacks

Base URL: https://pay.lmbtech.rw/pay/config/api

# GitHub Repository:

https://github.com/danieltn889/LMBTech Payment System API Documen tation.git

Sample Code & Test Files Access complete working examples, test scripts, and integration samples on

# Authentication

Every API request must include your credentials in the Authorization header. This ensures that only authorized applications can access the payment system.

# How Authentication Works

# Step 1: Get Your Credentials

You will receive two keys from LMBTech:

· App Key: Identifies your application   
. Secret Key: Proves your identity (keep this secret!)

# Step 2: Combine Your Keys

Combine your App Key and Secret Key with a colon (:) between them:

app_key:secret_key

# Step 3: Encode Using Base64

Convert the combined string to Base64 format. Base64 encoding turns your credentials into a safe format for HTTP headers.

# Step 4: Add to Request Header

Include the encoded string in your request header:

Authorization: Basic [base64_string]

# Making Payments (Collections)

Use this to accept payments from customers.

# Request Format

Method: POST

Content-Type: application/json

Endpoint: Base URL

![](images/223694f5929ecff79d50ebba2fbd682ea9b74c945835a513b6b3616e10c3db5d.jpg)

![](images/92d13bdde39e73ccc0bde341660619597101f6b3dfdfa2f5ceb8d5cd06fa956e.jpg)

# Required Fields

# For Mobile Money Only

Field

Description

Example

payer_phone

Customer phone

+250785085214

# For Card Payments Only

![](images/a07365fbde3d086adcd6d0b8239ab684367f2719e24dae6a2f3cdbc3447b9d25.jpg)

# Complete Request Examples

# Mobile Money Request:

json

"email": "customer@example.com",

"name": "John Doe",

"payment_method": "MTN_MOMO_RWA",

Card Payment Request:   
```txt
"amount": 1000,  
"payer_phone": "+250785085214",  
"service-paid": "order_123",  
"reference_id": "ORDER-20260215-1234",  
"callback_url": "https://your-site.com/cCallback",  
"action": "pay" 
```

Response Formats   
```json
json
{
    "email": "customer@example.com",
    "name": "John Doe",
    "payment_method": "card",
    "amount": 1000,
    "service-paid": "order_123",
    "reference_id": "ORDER-20260215-1234",
    "callback_url": "https://your-site.com/cCallback",
    "cardredirect_url": "https://your-site.com/card-directirect",
    "action": "pay"
} 
```

Mobile Money Success Response:   
```json
json
{
    "status": "success",
    "data": {
        "id": 8067,
        "reference_id": "ORDER-20260215-1234",
        "amount": "1000.00",
    }
} 
```

Card Payment Success Response:   
```txt
"status": "pending" }, "message": "Payment initiated successfully" } 
```

```hcl
json
{
    "status": "success",
    "data": {
        "reference_id": "ORDER-20260215-1234",
        "redirect_url":
    "https://pay.lmbtech.rw/pay/pesapal/iframe.php?reference_id=ORDER-20260215-1234"
    },
    "message": "Redirect to card payment gateway"
} 
```

Error Response:   
```json
json
{
    "status": "fail",
    "message": "Insufficient balance for payout"
} 
```

# What Happens Next

# For Mobile Money:

1. Customer receives a payment request on their phone   
2. They enter PIN to approve   
3. Your callback URL receives notification when complete

# For Card Payments:

1. User is redirected to the redirect_url from response

2. They enter card details on secure Pesapal page   
3. After payment, they're redirected back to your callback_url

# Sending Money (Payouts)

Use this to send money from your balance to customers.

# Important Requirements

. You must have sufficient balance in your account   
· Your account must have payout permissions enabled

# Request Format

Method: POST

Content-Type: application/json

```json
{
    "email": "your-account@example.com",
    "name": "Recipient Name",
    "payment_method": "MTN_MOMO_RWA",
    "amount": 500,
    "payer_phone": "+250785085214",
    "service-paid": "payout",
    "reference_id": "PAYOUT-20260215-5678",
    "callback_url": "https://your-site.com/cballback",
    "action": "payout"
} 
```

# Response

```txt
json   
{ "status": "success", "data": { 
```

```txt
"reference_id": "PAYOUT-20260215-5678",  
"amount": "500.00",  
"status": "pending"  
},  
"message": "Payout initiated successfully" 
```

# Checking Payment Status

You can check the status of any payment using its reference ID.

# Request Format

Method: GET

URL: Base URL with reference_id parameter

text

GET https:/ /pay.lmbtech.rw/pay/config/api.php?reference_id=ORDER-20260215-1234

# Response

```python
json
{
    "status": "success",
    "data": {
        "id": 8067,
        "reference_id": "ORDER-20260215-1234",
        "transaction_id": "TXN-987654321",
        "amount": "1000.00",
        "status": "success",
        "payment_method": "MTN_MOMO_RWA",
        "payment_date": "2026-02-15 12:35:22"
    }
} 
```

# Status Meanings

![](images/fce2fb00142274e0b83d1f0c6f3909e9c55d502b891731a2b040bcb5bcd89107.jpg)

# Caltback Implementation

This is the most important part of your integration. When a payment completes, the system sends a notification to your callback_url.

# What You Need to Do

1. Create an endpoint (URL) that can receive HTTP requests   
2. This endpoint must handle both:

o JSON data (for Mobile Money callbacks)   
o Form data (for Card payment callbacks)

3. Process the data and update your database   
4. Return a success response

# Callback Data Formats

# Mobile Money Callback (JSON):

```json
{
    "reference_id": "ORDER-20260215-1234",
    "transaction_id": "TXN-987654321",
    "status": "success",
    "amount": "1000.00",
} 
```

```txt
"payment_method": "MTN_MOMO_RWA",  
"payer_phone": "+250785085214" 
```

# Card Payment Callback (Form Data)

Field: pesapal_merchant_reference = ORDER-20260215-1234

Field: pesapal_transaction_tracking_id = TXN-987654321

Field: pesapal_response_data = COMPLETED

# Callback Handler Logic (Pseudo-code)

FUNCTION handle_callback(request):

/ / Step 1: Determine callback type and extract data

IF request has form data:

```python
reference_id = request.form["pesapalmerchant_reference"]
transaction_id = request.form["pesapal_transaction_tracking_id"] 
```

```txt
response = request.form["pesapal_response_data"] 
```

IF response == "COMPLETED":

```toml
status = "success" 
```

ELSE:

```toml
status = "failed" 
```

ELSE IF request has JSON body:

```txt
data = parse_json(request.body)  
reference_id = data["reference_id"]  
transaction_id = data["transaction_id"]  
status = data["status"] 
```

ELSE:

RETURN error_response("Invalid callback data")

// Step 2: Validate required data

IF reference_id is empty OR transaction_id is empty:

RETURN error_response("Missing required fields")

/ / Step 3: Update your database

database.execute(

"UPDATE orders SET payment_status = ?, transaction_id = ? WHERE reference_id = ?",

[status, transaction_id, reference_id]

）

/ / Step 4: Log for debugging

write_to_log("Callback processed: " + reference_id + ", Status: " + status)

/ / Step 5: Return success acknowledgment

RETURN success_response("Callback processed")

# Important Notes About Callbacks

. Callbacks may be sent multiple times - Your handler must be idempotent (check if already processed)   
. Always validate data before updating your database   
· Return a 20o OK response quickly to acknowledge receipt   
. Log everything for debugging purposes

# Card Payment Flow (Step by Step)

When a customer chooses to pay by card, here's the complete flow:

# Step 1: Initiate Payment

Your system sends the card payment request (as shown above).

# Step 2: Get Redirect URL

Response contains redirect_url:

https:/ /pay.lmbtech.rw/pay/pesapal/iframe.php?reference_id=ORDER-20260215-1234

# Step 3: Redirect Customer

Send the customer to this URL. They will see a secure payment page.

# Step 4: Customer Enters Card Details

The iframe.php page:

1. Fetches payment details from your reference   
2. Gets authentication from Pesapal   
3. Displays the card payment form

# Step 5: Payment Processing

Customer enters card details and completes payment on Pesapal's secure servers.

# Step 6: Redirect Back

After payment, customer is redirected to your callback_url with the transaction details.

# Step 7: Your Callback Handler

Your callback URL receives the form data and updates your database.

# Error Handling

# Common Error Responses

![](images/731b5e383cfaeec9945135c7ef6d16778d27f6d765dfdd9526f257789fe063c8.jpg)

![](images/ccd10fb5f7247f657c7107cce625d30709185966c279365f05c385dfb1688eed.jpg)

# Error Response Format

```txt
json
{
    "status": "fail",
    "message": "Description of what went wrong"
} 
```

# Testing

# Test Files Available

. Card Payment

Test: https://pay.lmbtech.rw/test_lmbtech_pay/test_card_api.php

Mobile Money

Test: https://pay.lmbtech.rw/test_lmbtech_pay/test_momo_api.php

# Test Credentials

text

App Key: app_68b06fca2067717563934188958

Secret Key: scrt_68b06fca206911756393418

# Test Phone Number

+250785085214 (for MTN MOMO)

# Test Amounts

Use small amounts for testing (e.g., 100, 200 RWF)

# Quick Reference

# API at a Glance

![](images/7fc108792c423b3c77ddd3fa5397794d93a8f17bde0bd82df621a9fa5232ed1c.jpg)

# Reference ID Format

Always use unique IDs:

text

Format: [PREFIX]-[DATE]-[RANDOM]

Example: ORDER-20260215-1234

# Phone Number Format

text

For Rwanda: +2507XXXXXXXX

Example: +250785085214

# Important URLs

: API Endpoint: https://pay.lmbtech.rw/pay/config/api.php   
. Card Payment

Page: https://pay.lmbtech.rw/pay/pesapal/iframe.php

. Support Email: support@lmbtech.rw
