export default async function handler(req) {
    return new Response('Hello World', {
        status: 200,
        headers: {
            'Content-Type': 'text/plain',
        },
    });
}