/**
 * Represents a single behavioral nudge tip for conservation.
 */
export interface Tip {
  id: string;
  content: string;
  category: string;
  isEditable: boolean;
}

/**
 * Manages the pool of daily tips and admin operations for conservation nudges.
 */
export class TipService {
  private tips: Tip[] = [
    { id: 't1', content: 'Turn off the tap while brushing your teeth.', category: 'daily', isEditable: true },
    { id: 't2', content: 'Fix leaks quickly to save gallons of water each day.', category: 'maintenance', isEditable: true },
    { id: 't3', content: 'Use a bucket instead of a hose when washing the car.', category: 'lifestyle', isEditable: true },
    { id: 't4', content: 'Collect rainwater for plants and cleaning chores.', category: 'savings', isEditable: true },
    { id: 't5', content: 'Run full loads in the washing machine to conserve water.', category: 'household', isEditable: true },
  ];

  private lastTipId: string | null = null;

  /**
   * Get a random tip from the current pool.
   * Prevents returning the same tip twice consecutively.
   */
  getRandomTip(): Tip | null {
    if (this.tips.length === 0) {
      return null;
    }

    if (this.tips.length === 1) {
      this.lastTipId = this.tips[0].id;
      return this.tips[0];
    }

    const availableTips = this.tips.filter(tip => tip.id !== this.lastTipId);
    const selected = availableTips[Math.floor(Math.random() * availableTips.length)];
    this.lastTipId = selected.id;
    return selected;
  }

  /**
   * Add a new tip to the pool.
   * Admin-only operation: assumes the caller has permission to modify tips.
   */
  addTip(newTip: Tip): void {
    this.tips.push(newTip);
  }

  /**
   * Update the content of an existing tip.
   * Admin-only operation: only editable tips may be modified.
   */
  updateTip(id: string, content: string): boolean {
    const tip = this.tips.find(t => t.id === id);
    if (!tip || !tip.isEditable) {
      return false;
    }

    tip.content = content;
    return true;
  }

  /**
   * Remove a tip from the pool by its id.
   * Admin-only operation: removes the tip permanently.
   */
  deleteTip(id: string): boolean {
    const initialLength = this.tips.length;
    this.tips = this.tips.filter(tip => tip.id !== id);
    if (this.lastTipId === id) {
      this.lastTipId = null;
    }
    return this.tips.length < initialLength;
  }

  /**
   * Get the current tip list for display or admin review.
   */
  getAllTips(): Tip[] {
    return [...this.tips];
  }
}
