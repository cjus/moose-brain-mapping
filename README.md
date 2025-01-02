# moose-brain-mapping
Moose powered Brain Mapping Demo

(i.e., a data analytics demo for your brain)

![DAS](./docs/das.png)

## Introduction

This is a demo of a data intensive Brain Mapping application that uses the Moose and the Muse Headband products.

[Moose](https://getmoose.com) is an application / infrastructure tool that simplifies the creation of data intensive applications. It's a product that a few of us over at [514 Labs](https://fiveonefour.com) have been building as an [open source tool](https://github.com/514-labs/moose) product.

The [Muse Headband](https://choosemuse.com) is an industry leading  wearable device that measures brainwave activity. It is a small, comfortable band that you wear on your head and it has 4 built-in sensors that measure the electrical activity of your brain.

<img src="./docs/museheadband.png" alt="Muse" width="300"/>

## OpenAI Data Analysis

We also support the use of OpenAI's gpt-4o model to analyze your brain data. This is optional, but it's a great way to obtain deeper insights into your brain data.

To enable OpenAI gpt-4o data analysis, you'll need to set the `OPENAI_API_KEY` environment variable in the moose project's `.env.local` file (which you'll need to create) located in the `apps/brainmoose` directory.  This is optional, but it's a great way to see deeper insights into your brain data.

## Demo Application in Fitness

The Muse device also has accelerometer and gyroscope sensors in order to capture 3D head movement. 

Those are the same sensors used in smart watches and fitness trackers. Using these sensors, we calculate movement scores for a particular session.

## Consumption API

The Consumption API is a Moose API that allows you to query the movement scores for a particular session.

```
http://localhost:4000/consumption/sessionInsights?sessions=1735784964|Meditation,1735785243|Coding
```

The `sessions` parameter is a comma separated list of sessionId and sessionLabel pairs.


## How this demo works

To allow Moose and the Muse Headband to communicate, we use a UDP Datagram Protocol (UDP) server called DAS (Data Acquisition Service) to receive UDP packets from an app that connects to the Muse Headband.

The DAS service (apps/das) is a Node.js application that uses the [osc-min](https://github.com/colinbdclark/osc-min) library to parse incoming UDP packets and send them via HTTP to the Moose server.

Moose in-turn ingests the data and uses [RedPanda](https://redpanda.com) and the  [Clickhouse](https://clickhouse.com) database to store in-flight and resting data. 

## Database schema and queries

```
timestamp  DateTime('UTC')
bandOn     Bool
acc        Nested(x Float64, y Float64, z Float64)	
gyro       Nested(x Float64, y Float64, z Float64)
alpha      Float64
beta	   Float64
delta	   Float64
theta	   Float64
gamma	   Float64 
sessionId  String
```

We evaluate head movement during a session by calculating a movement score.  We do this by aggregating the magnitude of the vectors accelerometer (acc) and gyroscope (gyro) data for a specific sessionId.

The magnitude of a vector is calculated using the [Euclidean norm](https://en.wikipedia.org/wiki/Euclidean_norm) (i.e., the square root of the sum of the squares of its components).

Here's a Clickhouse SQL query to calculate the movement scores:

```sql
SELECT
    sessionId,
    SUM(sqrt((arrayElement(acc, 1) * arrayElement(acc, 1)) +
             (arrayElement(acc, 2) * arrayElement(acc, 2)) +
             (arrayElement(acc, 3) * arrayElement(acc, 3)))) 
             AS acc_movement_score,
    SUM(sqrt((arrayElement(gyro, 1) * arrayElement(gyro, 1)) +
             (arrayElement(gyro, 2) * arrayElement(gyro, 2)) +
             (arrayElement(gyro, 3) * arrayElement(gyro, 3)))) 
             AS gyro_movement_score,
    (SUM(sqrt((arrayElement(acc, 1) * arrayElement(acc, 1)) +
              (arrayElement(acc, 2) * arrayElement(acc, 2)) +
              (arrayElement(acc, 3) * arrayElement(acc, 3)))) +
     SUM(sqrt((arrayElement(gyro, 1) * arrayElement(gyro, 1)) +
              (arrayElement(gyro, 2) * arrayElement(gyro, 2)) +
              (arrayElement(gyro, 3) * arrayElement(gyro, 3))))) 
              AS total_movement_score
FROM
    Brain_0_0
WHERE
    sessionId = '1735785243'
GROUP BY
    sessionId;
```

Meditation Movement Scores

 sessionId | acc\_movement\_score | gyro\_movement\_score | total\_movement\_score |
| :--- | :--- | :--- | :--- |
| 1735784964 | 96119.6529543984 | 773537.9565430604 | 869657.6094974588 |

Coding Movement Scores

| sessionId | acc\_movement\_score | gyro\_movement\_score | total\_movement\_score |
| :--- | :--- | :--- | :--- |
| 1735785243 | 91714.62041451405 | 801765.3217066663 | 893479.9421211804 |

