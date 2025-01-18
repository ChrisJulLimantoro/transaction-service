import { Injectable } from '@nestjs/common';
import { DiscoveryService, MetadataScanner, Reflector } from '@nestjs/core';
import {
  PATTERN_METADATA,
  PATTERN_HANDLER_METADATA,
} from '@nestjs/microservices/constants';
import { EXEMPT_PATTERN_METADATA } from '../decorator/exempt.decorator';
import { DESCRIBE_PATTERN_METADATA } from '../decorator/describe.decorator';

@Injectable()
export class MessagePatternDiscoveryService {
  constructor(
    private readonly discoveryService: DiscoveryService,
    private readonly metadataScanner: MetadataScanner,
    private readonly reflector: Reflector,
  ) {}
  getMessagePatterns() {
    const messagePatterns = [];
    const controllers = this.discoveryService
      .getControllers()
      .filter((wrapper) => wrapper.metatype);
    controllers.forEach((wrapper) => {
      const { instance } = wrapper;
      if (!instance || !Object.getPrototypeOf(instance)) {
        return;
      }
      this.metadataScanner.scanFromPrototype(
        instance,
        Object.getPrototypeOf(instance),
        (method) =>
          this.exploreMethodMetadata(instance, method, messagePatterns),
      );
    });
    console.log(messagePatterns);
    return messagePatterns;
  }
  exploreMethodMetadata(instance: any, method: string, messagePatterns: any[]) {
    const messagePattern = this.reflector.get<any>(
      PATTERN_METADATA,
      instance[method],
    );
    const isExempt =
      this.reflector.get<boolean>(EXEMPT_PATTERN_METADATA, instance[method]) ||
      false;

    const desribePattern = this.reflector.get<string>(
      DESCRIBE_PATTERN_METADATA,
      instance[method],
    );

    if (messagePattern && !isExempt) {
      messagePatterns.push({
        name: messagePattern[0].cmd,
        description: desribePattern?.[0] ?? 'No description',
      });
    }
  }
}
