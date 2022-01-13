import { Stack, StackProps, RemovalPolicy } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as events from 'aws-cdk-lib/aws-events';
import * as eventsTargets from 'aws-cdk-lib/aws-events-targets';
import * as lambda from 'aws-cdk-lib/aws-lambda';

export class CommuteTimesStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const primaryTable = new dynamodb.Table(this, 'table', {
      partitionKey: {
        name: 'id',
        type: dynamodb.AttributeType.STRING,
      },
      removalPolicy: RemovalPolicy.DESTROY,
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    });

    const environment: any = {
      PRIMARY_TABLE_NAME: primaryTable.tableName,
    };
    if (process.env.MAPBOX_API_KEY) {
      environment.MAPBOX_API_KEY = process.env.MAPBOX_API_KEY;
    }
    const scheduledLambda = new lambda.Function(this, 'lambda', {
      runtime: lambda.Runtime.NODEJS_14_X,
      code: lambda.Code.fromAsset('src'),
      handler: 'index.handler',
      environment,
    });

    primaryTable.grantWriteData(scheduledLambda);

    const morningSchedule = new events.Rule(this, 'morningSchedule', {
        schedule: events.Schedule.expression('cron(0/5 12-15 ? * MON-FRI *)'),
    });

    const afternoonSchedule = new events.Rule(this, 'afternoonSchedule', {
      schedule: events.Schedule.expression('cron(0/5 22-23 ? * MON-FRI *)'),
  });

    const lambdaTarget = new eventsTargets.LambdaFunction(scheduledLambda)
    morningSchedule.addTarget(lambdaTarget);
    afternoonSchedule.addTarget(lambdaTarget);
  }
}
