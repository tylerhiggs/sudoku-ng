import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  signal,
} from '@angular/core';
import {
  ChatMessage,
  GameEvent,
} from '@services/collaboration/collaboration.service';

@Component({
  selector: 'app-chat',
  imports: [DatePipe],
  templateUrl: './chat.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatComponent {
  readonly events = input<GameEvent[]>([]);
  readonly chats = input<ChatMessage[]>([]);

  readonly sendMessage = output<string>();

  readonly newMessage = signal('');

  readonly onSendMessage = () => {
    const message = this.newMessage().trim();
    if (!message) {
      return;
    }
    this.sendMessage.emit(message);
    console.log('Sent message:', message);
    this.newMessage.set('');
  };

  readonly keydown = (event: KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      event.stopPropagation();
      this.onSendMessage();
    }
  };

  readonly input = (event: Event) => {
    event.preventDefault();
    event.stopPropagation();
    const target = event.target as HTMLInputElement;
    this.newMessage.set(target.value);
  };

  readonly allEvents = computed(() => {
    const mappedChats: (ChatMessage & { type: 'chat' })[] = this.chats().map(
      (chat) => ({ ...chat, type: 'chat' }),
    );
    return [...this.events(), ...mappedChats]
      .sort((a, b) => a.timestamp - b.timestamp)
      .slice(-100);
  });
}
