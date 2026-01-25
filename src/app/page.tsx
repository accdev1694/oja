'use client';

import {
  Button,
  Card,
  CardHeader,
  CardContent,
  CardFooter,
  Input,
} from '@/components/ui';
import { useState } from 'react';

export default function Home() {
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLoadingDemo = () => {
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[var(--color-warm-white)] p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-[var(--color-charcoal)]">
            Oja Design System
          </h1>
          <p className="text-lg text-[var(--color-muted)]">
            Budget-First Shopping Confidence
          </p>
        </div>

        {/* Button Variants */}
        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold text-[var(--color-charcoal)]">
              Button Variants
            </h2>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <Button variant="primary">Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="destructive">Destructive</Button>
              <Button
                variant="primary"
                isLoading={isLoading}
                onClick={handleLoadingDemo}
              >
                {isLoading ? 'Loading...' : 'Loading Demo'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Button Sizes */}
        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold text-[var(--color-charcoal)]">
              Button Sizes
            </h2>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-4">
              <Button size="small">Small</Button>
              <Button size="default">Default (44px)</Button>
              <Button size="large">Large</Button>
            </div>
          </CardContent>
        </Card>

        {/* Input Components */}
        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold text-[var(--color-charcoal)]">
              Input Components
            </h2>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Input
                label="Email Address"
                type="email"
                placeholder="you@example.com"
                helperText="We'll never share your email"
              />
              <Input
                label="Password"
                type="password"
                placeholder="Enter password"
              />
              <Input
                label="Budget Amount"
                type="number"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                helperText="Set your shopping budget"
              />
              <Input label="Error State" error="This field is required" />
              <Input
                label="Disabled Input"
                disabled
                placeholder="This is disabled"
              />
            </div>
          </CardContent>
        </Card>

        {/* Card Variants */}
        <Card padding="compact">
          <CardHeader>
            <h3 className="text-lg font-semibold">Compact Card</h3>
          </CardHeader>
          <CardContent>
            <p className="text-[var(--color-muted)]">
              This card uses compact padding (p-3)
            </p>
          </CardContent>
        </Card>

        <Card padding="spacious">
          <CardHeader>
            <h3 className="text-lg font-semibold">Spacious Card</h3>
          </CardHeader>
          <CardContent>
            <p className="text-[var(--color-muted)]">
              This card uses spacious padding (p-6)
            </p>
          </CardContent>
        </Card>

        {/* Interactive Card */}
        <Card interactive>
          <CardHeader>
            <h3 className="text-lg font-semibold">Interactive Card</h3>
          </CardHeader>
          <CardContent>
            <p className="text-[var(--color-muted)]">
              Hover over this card to see the interactive effect
            </p>
          </CardContent>
          <CardFooter>
            <Button size="small" variant="ghost">
              Learn More
            </Button>
            <Button size="small">Get Started</Button>
          </CardFooter>
        </Card>

        {/* Color Palette */}
        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold text-[var(--color-charcoal)]">
              Oja Color Palette
            </h2>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <div className="h-20 rounded-md bg-[var(--color-orange)] border border-gray-200"></div>
                <p className="text-sm font-medium">Orange (Primary)</p>
              </div>
              <div className="space-y-2">
                <div className="h-20 rounded-md bg-[var(--color-charcoal)] border border-gray-200"></div>
                <p className="text-sm font-medium">Charcoal</p>
              </div>
              <div className="space-y-2">
                <div className="h-20 rounded-md bg-[var(--color-warm-white)] border border-gray-200"></div>
                <p className="text-sm font-medium">Warm White</p>
              </div>
              <div className="space-y-2">
                <div className="h-20 rounded-md bg-[var(--color-safe-zone-green)] border border-gray-200"></div>
                <p className="text-sm font-medium">Safe Zone Green</p>
              </div>
              <div className="space-y-2">
                <div className="h-20 rounded-md bg-[var(--color-safe-zone-amber)] border border-gray-200"></div>
                <p className="text-sm font-medium">Safe Zone Amber</p>
              </div>
              <div className="space-y-2">
                <div className="h-20 rounded-md bg-[var(--color-safe-zone-red)] border border-gray-200"></div>
                <p className="text-sm font-medium">Safe Zone Red</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
