import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  linkedSignal,
  OnInit,
  output,
  signal,
} from '@angular/core';
import {
  ChatMessage,
  GameEvent,
} from '@services/collaboration/collaboration.service';
import { LOCAL_STORAGE_KEYS } from '@/../constants';

@Component({
  selector: 'app-chat',
  imports: [DatePipe],
  templateUrl: './chat.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatComponent implements OnInit {
  readonly events = input<GameEvent[]>([]);
  readonly chats = input<ChatMessage[]>([]);

  readonly playerName = input<string>('');

  readonly playerId =
    localStorage.getItem(LOCAL_STORAGE_KEYS.CURRENT_PLAYER_ID) || '';

  constructor() {
    effect((onCleanup) => {
      // Always access signals first to ensure tracking
      const chats = this.chats();
      const events = this.events();
      const isAtBottom = this.isScrolledToBottom();

      console.log('Checking scroll position');

      if (!isAtBottom && (chats.length || events.length)) {
        return;
      }

      console.log('Scrolling to bottom');
      const timeout = setTimeout(() => {
        this.scrollToBottom();
      }, 0);

      onCleanup(() => clearTimeout(timeout));
    });
  }

  ngOnInit() {
    setTimeout(() => {
      this.scrollToBottom();
    }, 500);
  }

  readonly updatePlayerName = output<string>();
  readonly sendMessage = output<string>();

  readonly newMessage = signal('');
  readonly newPlayerName = linkedSignal(this.playerName);
  readonly playerNameDebounceTimeout = signal<NodeJS.Timeout | null>(null);

  readonly onUpdatePlayerName = (event: Event) => {
    const target = event.target as HTMLInputElement;
    this.newPlayerName.set(target.value);
    if (this.playerNameDebounceTimeout()) {
      clearTimeout(this.playerNameDebounceTimeout()!);
    }
    this.playerNameDebounceTimeout.set(
      setTimeout(() => {
        this.updatePlayerName.emit(this.newPlayerName().trim());
        this.playerNameDebounceTimeout.set(null);
      }, 1000),
    );
  };

  readonly onSendMessage = () => {
    const message = this.newMessage().trim();
    if (!message) {
      return;
    }
    this.sendMessage.emit(message);
    this.newMessage.set('');
    setTimeout(() => {
      this.scrollToBottom();
    }, 0);
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

  readonly trackByEvent = (index: number, item: GameEvent | ChatMessage) => {
    if ('id' in item && item.id) {
      return item.id;
    }
    return `${item.timestamp}_${index}`;
  };

  readonly isScrolledToBottom = () => {
    const scrollElement = document.getElementById('chat-messages');
    if (!scrollElement) {
      return true;
    }
    return (
      scrollElement.scrollHeight - scrollElement.scrollTop <=
      scrollElement.clientHeight + 20
    );
  };

  readonly scrollToBottom = () => {
    const scrollElement = document.getElementById('chat-messages');
    if (scrollElement) {
      scrollElement.scrollTop = scrollElement.scrollHeight;
    }
  };
}
