//
// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license.
//
// Microsoft Bot Framework: http://botframework.com
//
// Bot Framework Emulator Github:
// https://github.com/Microsoft/BotFramwork-Emulator
//
// Copyright (c) Microsoft Corporation
// All rights reserved.
//
// MIT License:
// Permission is hereby granted, free of charge, to any person obtaining
// a copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to
// permit persons to whom the Software is furnished to do so, subject to
// the following conditions:
//
// The above copyright notice and this permission notice shall be
// included in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED ""AS IS"", WITHOUT WARRANTY OF ANY KIND,
// EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
// NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
// LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
// OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
// WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
//
import { Activity } from 'botframework-schema';
import { ChatReplayData, HasIdAndReplyId } from '@bfemulator/app-shared';
import { dispatch } from 'packages/app/main/src/state';

export class ConversationQueue {
  private userActivities: Activity[] = [];
  private botActivites: Activity[] = [];
  private replayDataFromOldConversation: ChatReplayData;
  private receivedActivities: Activity[];
  private conversationId: string;

  // private createObjectUrlFromWindow: Function;

  constructor(activities: Activity[], chatReplayData: ChatReplayData, conversationId: string) {
    this.userActivities = activities.filter(
      (activity: Activity) => activity.from.role === 'user' && activity.channelData
    );
    this.conversationId = conversationId;
    this.botActivites = activities.filter((activity: Activity) => activity.from.role !== 'user');
    this.replayDataFromOldConversation = chatReplayData;
    this.receivedActivities = [];
  }

  private static dataURLtoFile(dataurl: string, filename: string) {
    var arr = dataurl.split(','),
      mime = arr[0].match(/:(.*?);/)[1],
      bstr = atob(arr[1]),
      n = bstr.length,
      u8arr = new Uint8Array(n);

    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }

    return new File([u8arr], filename, { type: mime });
  }

  public incomingActivity(dispatch, activity: Activity): Activity {
    this.receivedActivities.push(activity);

    if (activity.channelData && !activity.replyToId) {
      const matchIndexes: number[] = activity.channelData.matchIndexes;
      if (matchIndexes) {
        matchIndexes.forEach((index: number) => {
          if (this.receivedActivities[index].replyToId === activity.id) {
            console.log('ON TRACK');
          } else {
            console.log('OFF TRACK');
          }
        });
      }
    }

    if (this.replayDataFromOldConversation.postActivitiesSlots.includes(this.receivedActivities.length)) {
      const nextActivity: Activity = this.userActivities.shift();
      const matchIndexes = [];
      this.replayDataFromOldConversation.incomingActivities.forEach((activity: HasIdAndReplyId, index: number) => {
        if (activity.replyToId === nextActivity.id) {
          matchIndexes.push(index);
        }
      });

      if (nextActivity) {
        delete nextActivity.id;
        nextActivity.conversation = {
          ...nextActivity.conversation,
          id: this.conversationId,
        };
        nextActivity.channelData = {
          ...nextActivity.channelData,
          originalActivityId: nextActivity.id,
          matchIndexes,
        };

        return nextActivity;
      }
    }
    return undefined;
  }
}
