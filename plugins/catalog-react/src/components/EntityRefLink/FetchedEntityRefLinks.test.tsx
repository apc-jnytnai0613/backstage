/*
 * Copyright 2022 The Backstage Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { FetchedEntityRefLinks } from './FetchedEntityRefLinks';
import { entityRouteRef } from '../../routes';
import { renderInTestApp, TestApiProvider } from '@backstage/test-utils';
import { Entity } from '@backstage/catalog-model';
import React from 'react';
import { JsonObject } from '@backstage/types';
import { catalogApiRef } from '../../api';
import { CatalogApi } from '@backstage/catalog-client';

describe('<FetchedEntityRefLinks />', () => {
  it('should fetch entities and render the custom display text', async () => {
    const entityRefs = [
      {
        kind: 'Component',
        namespace: 'default',
        name: 'software',
      },
      {
        kind: 'API',
        namespace: 'default',
        name: 'interface',
      },
    ];

    const catalogApi: Partial<CatalogApi> = {
      getEntities: () =>
        Promise.resolve({
          items: entityRefs.map(ref => ({
            apiVersion: 'backstage.io/v1alpha1',
            kind: ref.kind,
            metadata: {
              name: ref.name,
              namespace: ref.namespace,
            },
            spec: {
              profile: {
                displayName: ref.name.toLocaleUpperCase('en-US'),
              },
              type: 'organization',
            },
          })),
        }),
    };

    const getTitle = (e: Entity): string =>
      (e.spec?.profile!! as JsonObject).displayName!!.toString()!!;

    const rendered = await renderInTestApp(
      <TestApiProvider apis={[[catalogApiRef, catalogApi]]}>
        <FetchedEntityRefLinks entityRefs={entityRefs} getTitle={getTitle} />
      </TestApiProvider>,
      {
        mountedRoutes: {
          '/catalog/:namespace/:kind/:name/*': entityRouteRef,
        },
      },
    );

    expect(rendered.getByText('SOFTWARE')).toHaveAttribute(
      'href',
      '/catalog/default/component/software',
    );

    expect(rendered.getByText('INTERFACE')).toHaveAttribute(
      'href',
      '/catalog/default/api/interface',
    );
  });
});
