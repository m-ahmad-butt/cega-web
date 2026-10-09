const amqp = require('amqplib');

let connection = null;
let channel = null;

const connectRabbitMQ = async () => {
  try {
    connection = await amqp.connect(process.env.RABBITMQ_URL);
    channel = await connection.createChannel();
    console.log('RabbitMQ connected');

    await channel.assertExchange('examslot.direct', 'direct', { durable: true });
    await channel.assertExchange('examslot.topic', 'topic', { durable: true });

    const queues = ['email.notifications'];
    for (const queueName of queues) {
      await channel.assertQueue(queueName, { durable: true });
    }

    await channel.bindQueue('email.notifications', 'examslot.direct', 'email');

    connection.on('error', (err) => console.error('RabbitMQ error:', err));
    connection.on('close', () => console.warn('RabbitMQ closed'));
  } catch (error) {
    console.warn('[RabbitMQ] Connection failed (non-fatal):', error.message);
  }
};

const publishMessage = async (routingKey, message, exchange = 'examslot.direct') => {
  try {
    if (!channel) {
      console.warn('[RabbitMQ] Channel not initialized, message dropped');
      return false;
    }
    const messageBuffer = Buffer.from(JSON.stringify({ ...message, timestamp: new Date().toISOString() }));
    await channel.publish(exchange, routingKey, messageBuffer, { persistent: true });
    return true;
  } catch (error) {
    console.error('Failed to publish message:', error);
    return false;
  }
};

module.exports = { connectRabbitMQ, publishMessage };
