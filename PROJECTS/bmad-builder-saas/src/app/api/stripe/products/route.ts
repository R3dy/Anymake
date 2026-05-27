import { stripe } from '@/lib/stripe';

export async function GET() {
  try {
    const products = await stripe.products.list({ limit: 10 });
    
    return Response.json({
      products: products.data.map((product) => ({
        id: product.id,
        name: product.name,
        description: product.description || '',
        metadata: product.metadata,
        active: product.active,
      })),
    });
  } catch (error) {
    console.error('Stripe products error:', error);
    return Response.json(
      { error: 'Failed to fetch Stripe products' },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    const body = await request.json();
    
    const { name, description, price } = body;

    if (!name || !price) {
      return Response.json(
        { error: 'Name and price are required' },
        { status: 400 }
      );
    }

    const product = await stripe.products.create({
      name,
      description,
      metadata: {
        app: 'bmad-builder',
      },
    });

    await stripe.prices.create({
      product: product.id,
      unit_amount: Math.round(price * 100),
      currency: 'usd',
    });

    return Response.json({
      product: {
        id: product.id,
        name: product.name,
        description: product.description || '',
      },
    });
  } catch (error) {
    console.error('Stripe create product error:', error);
    return Response.json(
      { error: 'Failed to create Stripe product' },
      { status: 500 }
    );
  }
}
