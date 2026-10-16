import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  CompartmentDetail,
  CompartmentReport,
  JobsTotalRow,
  Me,
  RawRow,
  SpaceResponse,
  SpaceSummary,
  SplitRow,
} from './api.models';

@Injectable({ providedIn: 'root' })
export class SpaceApi {
  private readonly http = inject(HttpClient);

  me(): Observable<Me> {
    return this.http.get<Me>('/api/me');
  }

  spaces(): Observable<SpaceSummary[]> {
    return this.http.get<SpaceSummary[]>('/api/spaces');
  }

  raw(space: string): Observable<SpaceResponse<RawRow[]>> {
    return this.http.get<SpaceResponse<RawRow[]>>(this.url(space, 'raw'));
  }

  split(space: string): Observable<SpaceResponse<SplitRow[]>> {
    return this.http.get<SpaceResponse<SplitRow[]>>(this.url(space, 'split'));
  }

  jobsTotals(space: string): Observable<SpaceResponse<JobsTotalRow[]>> {
    return this.http.get<SpaceResponse<JobsTotalRow[]>>(this.url(space, 'jobs-totals'));
  }

  compartments(space: string): Observable<SpaceResponse<CompartmentReport>> {
    return this.http.get<SpaceResponse<CompartmentReport>>(this.url(space, 'compartments'));
  }

  workspaces(space: string, includeJobs: boolean): Observable<SpaceResponse<CompartmentDetail[]>> {
    const params = new HttpParams().set('includeJobs', includeJobs);
    return this.http.get<SpaceResponse<CompartmentDetail[]>>(this.url(space, 'workspaces'), { params });
  }

  private url(space: string, page: string): string {
    return `/api/spaces/${encodeURIComponent(space)}/${page}`;
  }
}
